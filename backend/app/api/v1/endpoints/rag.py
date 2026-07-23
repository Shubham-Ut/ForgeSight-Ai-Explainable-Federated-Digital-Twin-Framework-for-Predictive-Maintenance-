"""
ForgeSight AI — RAG Assistant with Sentence-Transformers + FAISS
Replaces keyword overlap + random.uniform() similarity with:
  - SentenceTransformer('all-MiniLM-L6-v2') embeddings
  - FAISS flat L2 index for semantic vector retrieval
  - Real cosine similarity scores
  - OpenRouter LLM generation (with graceful offline fallback)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Optional, List

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.domain.models import ApiResponse, RagQueryRequest
from app.services.store import DOCUMENTS_STORE, MACHINES_STORE

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
OPENROUTER_API_KEY  = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL    = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")


# ── FAISS + Sentence-Transformer Index ───────────────────────────────────────

class VectorIndex:
    """
    Maintains a FAISS flat L2 index of document embeddings.
    Rebuilt on demand; embeddings computed with SentenceTransformer.
    """
    _instance: Optional["VectorIndex"] = None

    def __init__(self):
        self._encoder = None
        self._index = None
        self._doc_ids: List[str] = []
        self._ready = False

    @classmethod
    def get(cls) -> "VectorIndex":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._build()
        return cls._instance

    def _load_encoder(self):
        if self._encoder is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._encoder = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("rag.encoder_loaded")
            except Exception as exc:
                logger.error("rag.encoder_load_failed", extra={"error": str(exc)})
                raise RuntimeError(f"sentence-transformers unavailable: {exc}") from exc

    def _build(self) -> None:
        """Build FAISS index from current DOCUMENTS_STORE."""
        try:
            import faiss
            self._load_encoder()

            if not DOCUMENTS_STORE:
                self._ready = False
                return

            texts = [
                f"{doc['title']}. {doc['content']}" for doc in DOCUMENTS_STORE
            ]
            embeddings = self._encoder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            dim = embeddings.shape[1]

            self._index = faiss.IndexFlatIP(dim)  # Inner product = cosine (normalized)
            self._index.add(embeddings.astype(np.float32))
            self._doc_ids = [doc["id"] for doc in DOCUMENTS_STORE]
            self._ready = True
            logger.info("rag.faiss_index_built", extra={"n_docs": len(self._doc_ids)})

        except Exception as exc:
            logger.error("rag.faiss_build_failed", extra={"error": str(exc)})
            self._ready = False

    def rebuild(self) -> None:
        self._doc_ids = []
        self._index = None
        self._ready = False
        self._build()

    def search(self, query: str, k: int = 3) -> List[dict]:
        """
        Semantic search: returns top-k documents with real similarity scores.
        Falls back to text overlap if FAISS unavailable.
        """
        if self._ready and self._index is not None and self._encoder is not None:
            try:
                q_emb = self._encoder.encode([query], convert_to_numpy=True, normalize_embeddings=True)
                scores, indices = self._index.search(q_emb.astype(np.float32), min(k, len(self._doc_ids)))
                results = []
                for rank, (score, idx) in enumerate(zip(scores[0], indices[0])):
                    if idx < 0 or idx >= len(DOCUMENTS_STORE):
                        continue
                    doc = DOCUMENTS_STORE[idx]
                    results.append({
                        "document_id": doc["id"],
                        "title": doc["title"],
                        "similarity": round(float(score), 4),
                        "excerpt": doc["content"][:300] + ("..." if len(doc["content"]) > 300 else ""),
                        "page": 1,
                    })
                return results
            except Exception as exc:
                logger.warning("rag.faiss_search_failed", extra={"error": str(exc)})

        # Fallback: text overlap (TF-IDF-like) — documented as fallback
        logger.info("rag.using_text_overlap_fallback")
        keywords = [w.lower() for w in query.split() if len(w) > 3]
        scored = []
        for doc in DOCUMENTS_STORE:
            score = 0.0
            content_lower = doc["content"].lower()
            title_lower = doc["title"].lower()
            for kw in keywords:
                if kw in content_lower:
                    score += 0.15
                if kw in title_lower:
                    score += 0.25
            if score > 0 or not keywords:
                scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "document_id": doc["id"],
                "title": doc["title"],
                "similarity": round(score, 4),
                "excerpt": doc["content"][:300] + "...",
                "page": 1,
                "retrieval_method": "text_overlap_fallback",
            }
            for score, doc in scored[:k]
        ]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/query", response_model=ApiResponse)
async def query_rag(body: RagQueryRequest):
    """
    Semantic RAG query:
    1. Encode query with SentenceTransformer
    2. FAISS search for top-k relevant documents
    3. Build context string
    4. Call OpenRouter LLM (or return retrieval-only if no API key)
    """
    import httpx

    query_text = body.query
    machine_id = body.machine_id

    # 1. Semantic retrieval
    index = VectorIndex.get()
    matched_sources = index.search(query_text, k=3)

    # 2. Machine context
    machine_context = None
    if machine_id:
        machine = MACHINES_STORE.get(machine_id)
        if machine:
            machine_context = {
                "machineId": machine_id,
                "rul": machine.get("predicted_rul"),
                "healthScore": machine.get("health_score"),
                "status": machine.get("status"),
            }

    # 3. Build context string from retrieved docs
    doc_map = {doc["id"]: doc for doc in DOCUMENTS_STORE}
    context_chunks = []
    for src in matched_sources:
        doc = doc_map.get(src["document_id"])
        if doc:
            context_chunks.append(f"Source: {doc['title']}\nContent: {doc['content']}")

    answer = ""
    confidence = 0.0

    # 4. LLM generation if API key present
    if OPENROUTER_API_KEY and context_chunks:
        context_str = "\n\n".join(context_chunks[:2])
        prompt = (
            "You are ForgeSight AI Technical Maintenance Copilot.\n"
            "Below is retrieved operating context from standard operating procedures:\n"
            f"---\n{context_str}\n---\n"
            f"Active machine telemetry: {machine_context or 'None'}\n\n"
            f"Answer the operator's query professionally:\nQuery: {query_text}"
        )
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "ForgeSight AI",
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                    },
                )
                if response.status_code == 200:
                    answer = response.json()["choices"][0]["message"]["content"]
                    confidence = 0.95
                else:
                    logger.warning("rag.openrouter_error", extra={"status": response.status_code})
        except Exception as exc:
            logger.warning("rag.llm_call_failed", extra={"error": str(exc)})

    # 5. Offline retrieval-only response
    if not answer:
        if matched_sources:
            best_doc = doc_map.get(matched_sources[0]["document_id"])
            answer = (
                f"[Retrieval-Only Mode] Based on retrieved document "
                f"'{matched_sources[0]['title']}' (similarity: {matched_sources[0]['similarity']:.3f}):\n\n"
                f"{best_doc['content'][:600] if best_doc else 'No content available.'}"
            )
            confidence = float(matched_sources[0]["similarity"])
        else:
            answer = (
                "No relevant documents found for this query. "
                "Please upload maintenance manuals or SOPs via the document upload endpoint."
            )
            confidence = 0.0

    return ApiResponse(data={
        "answer": answer,
        "sources": matched_sources,
        "machine_context": machine_context,
        "confidence": round(confidence, 3),
        "retrieval_method": "faiss_semantic" if index._ready else "text_overlap_fallback",
        "generated_at": datetime.utcnow().isoformat(),
    })


@router.get("/documents", response_model=ApiResponse)
async def list_documents():
    documents = [
        {
            "id": d["id"],
            "title": d["title"],
            "category": d.get("category", "manual"),
            "uploaded_at": datetime.utcnow().isoformat(),
            "file_size_kb": len(d["content"]) // 1024 + 1,
        }
        for d in DOCUMENTS_STORE
    ]
    return ApiResponse(data=documents)


@router.post("/upload", response_model=ApiResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
):
    try:
        contents = await file.read()
        text_content = contents.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot parse file: {exc}")

    doc_title = title or file.filename or "Uploaded Document"
    doc_id = f"doc-{int(datetime.utcnow().timestamp())}"

    new_doc = {
        "id": doc_id,
        "title": doc_title,
        "content": text_content,
        "category": "manual",
    }
    DOCUMENTS_STORE.append(new_doc)

    # Rebuild FAISS index to include new document
    try:
        VectorIndex.get().rebuild()
    except Exception as exc:
        logger.warning("rag.index_rebuild_failed", extra={"error": str(exc)})

    return ApiResponse(
        data={
            "id": doc_id,
            "title": doc_title,
            "category": "manual",
            "uploaded_at": datetime.utcnow().isoformat(),
            "file_size_kb": len(text_content) // 1024 + 1,
        },
        message=f"Document indexed and added to FAISS vector store.",
    )
