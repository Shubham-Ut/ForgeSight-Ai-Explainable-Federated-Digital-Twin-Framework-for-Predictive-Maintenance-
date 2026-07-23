import React, { useState, useRef, useEffect } from 'react';
import {
  Send, MessageSquare, BookOpen, Wrench, AlertTriangle,
  ThumbsUp, ThumbsDown, Copy, RotateCcw, ChevronRight,
  FileText, Clock,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

// ── Preset prompts ─────────────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { label: 'Lathe Station 1 diagnosis', prompt: 'What is causing the bearing degradation on Lathe Station 1 and what should I do?' },
  { label: 'Regreasing procedure', prompt: 'Walk me through the precision bearing regreasing procedure for a CNC spindle.' },
  { label: 'Coolant system check', prompt: 'What are the standard checks for coolant system pressure drops?' },
  { label: 'Vibration thresholds', prompt: 'What are the ISO vibration alarm thresholds for rotating machinery?' },
];

// ── Mock AI responses ─────────────────────────────────────────────────────────────
const AI_RESPONSES: Record<string, { content: string; sources: string[] }> = {
  default: {
    content: `Based on the current sensor telemetry and the retrieved maintenance documentation, here is my analysis:

**Root Cause Assessment:**
The SHAP analysis indicates that **vibration (contribution: +2.34)** and **temperature (+1.85)** are the primary drivers of the degradation signal. This pattern is consistent with early-stage bearing fatigue.

**Recommended Actions (ISO 13373-3 compliant):**
1. Perform an immediate vibration spectrum analysis to confirm bearing signature frequencies
2. Schedule precision outer bearing regreasing within the next 12 operating hours
3. Apply ISO VG 460 polyurea synthetic grease as per OEM specification
4. Re-torque the retaining ring to 45–50 Nm

**Risk Assessment:**
Current RUL estimate is **24 hours**. Operating beyond this threshold carries a **94% probability** of secondary spindle bearing scoring based on federated model consensus.

**Source Documents Retrieved:** ISO 13373-3, CNC-Lathe OEM Service Manual v4.2, ForgeSight SOP-ML-004`,
    sources: ['ISO 13373-3:2015', 'CNC-Lathe OEM Manual v4.2', 'SOP-ML-004'],
  },
};

const getResponse = (_prompt: string) => AI_RESPONSES.default;

// ── Message Bubble ────────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold',
        isUser
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'bg-bg-subtle border border-border text-text-secondary',
      )}>
        {isUser ? 'SU' : 'AI'}
      </div>

      {/* Content */}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-lg px-4 py-3 text-[13px] leading-relaxed',
          isUser
            ? 'bg-accent text-white'
            : 'bg-bg-surface border border-border text-text-primary',
        )}>
          {/* Render content with markdown-like formatting */}
          <div className={cn('prose-sm', isUser && 'text-white')}>
            {message.content.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>;
              }
              if (line.match(/^\d+\./)) {
                return <p key={i} className="ml-3 text-[12px] mt-0.5">{line}</p>;
              }
              if (line.startsWith('**') && line.includes('**')) {
                return <p key={i} className="mt-1" dangerouslySetInnerHTML={{
                  __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }} />;
              }
              return line ? <p key={i} className="mt-1.5">{line}</p> : <div key={i} className="h-1" />;
            })}
          </div>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-bg-subtle border border-border rounded text-[10px] text-text-secondary">
                <FileText size={9} strokeWidth={2} />
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-0.5 mt-1.5">
            <button onClick={handleCopy} className="btn-icon w-6 h-6 text-[10px]">
              <Copy size={11} strokeWidth={1.75} />
            </button>
            <button className="btn-icon w-6 h-6">
              <ThumbsUp size={11} strokeWidth={1.75} />
            </button>
            <button className="btn-icon w-6 h-6">
              <ThumbsDown size={11} strokeWidth={1.75} />
            </button>
            <span className="text-[10px] text-text-tertiary ml-1 flex items-center gap-0.5">
              <Clock size={9} strokeWidth={1.75} />
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────────
export default function RagAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m the ForgeSight AI co-pilot, grounded in your certified maintenance documentation and real-time machine telemetry. Ask me about machine diagnostics, repair procedures, or predictive maintenance insights.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 1200));

    const response = getResponse(messageText);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      sources: response.sources,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Sidebar — Context */}
      <div className="hidden lg:flex w-64 flex-col border-r border-border bg-bg-surface flex-shrink-0">
        <div className="px-4 py-4 border-b border-border">
          <p className="section-title">Knowledge Base</p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Retrieval sources</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {[
            { icon: BookOpen, label: 'ISO 13373-3:2015', sub: 'Vibration diagnosis' },
            { icon: Wrench, label: 'CNC-Lathe OEM Manual', sub: 'v4.2, 312 pages' },
            { icon: FileText, label: 'SOP-ML-004', sub: 'ML maintenance protocol' },
            { icon: FileText, label: 'SOP-FL-001', sub: 'Federated procedures' },
            { icon: AlertTriangle, label: 'Safety Guidelines', sub: 'OSHA 1910.147' },
          ].map((doc, i) => {
            const Icon = doc.icon;
            return (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-md hover:bg-bg-subtle cursor-pointer transition-colors duration-150">
                <Icon size={14} strokeWidth={1.75} className="text-text-tertiary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-text-primary truncate">{doc.label}</p>
                  <p className="text-[10px] text-text-tertiary">{doc.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-3">
          <div className="px-3 py-2 bg-status-info-bg border border-status-info-border rounded-md">
            <p className="text-[11px] font-medium text-status-info">RAG Active</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">5 documents indexed</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0">
                AI
              </div>
              <div className="bg-bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-skeleton"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <div className="px-6 pb-4">
            <p className="label mb-2">Suggested queries</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.prompt)}
                  className="text-left px-3 py-2.5 rounded-md border border-border bg-bg-surface hover:bg-bg-subtle hover:border-border-strong transition-colors duration-150 text-[12px] text-text-secondary hover:text-text-primary"
                >
                  {p.label}
                  <ChevronRight size={11} strokeWidth={2} className="inline ml-1 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-6 py-4 bg-bg-surface">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about machine diagnostics, repair procedures, or maintenance schedules..."
                rows={1}
                className="w-full resize-none forge-input py-2.5 pr-12 min-h-[44px] max-h-32 leading-relaxed"
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="btn-primary flex-shrink-0 h-[44px]"
            >
              <Send size={14} strokeWidth={2} />
              Send
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary mt-2">
            Responses are grounded in certified SOPs. Always verify with qualified engineers.
          </p>
        </div>
      </div>
    </div>
  );
}
