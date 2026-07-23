"""
ForgeSight AI — Federated Learning Strategy
FedAvg, FedProx, and custom strategy with Differential Privacy hooks
"""
from __future__ import annotations
from typing import Dict, List, Optional, Tuple
import numpy as np
from flwr.server.strategy import FedAvg, FedProx
from flwr.common import (
    FitRes, Parameters, Scalar, ndarrays_to_parameters, parameters_to_ndarrays,
)
from flwr.server.client_proxy import ClientProxy
import structlog

logger = structlog.get_logger(__name__)


class ForgeSightFedAvg(FedAvg):
    """
    FedAvg with Differential Privacy noise injection at aggregation.
    Implements Gaussian mechanism: noise ~ N(0, σ²·C²)
    where C = clipping norm, σ = noise multiplier.
    """

    def __init__(
        self,
        noise_sigma: float = 0.5,
        clipping_norm: float = 1.0,
        privacy_budget_epsilon: float = 2.8,
        privacy_delta: float = 1e-5,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.noise_sigma = noise_sigma
        self.clipping_norm = clipping_norm
        self.privacy_budget_epsilon = privacy_budget_epsilon
        self.privacy_delta = privacy_delta
        self._total_epsilon_used = 0.0
        self._round_history: List[Dict] = []

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[BaseException],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Aggregate with differential privacy noise injection."""
        if not results:
            return None, {}

        # Weighted aggregation (FedAvg)
        num_examples_total = sum(fit_res.num_examples for _, fit_res in results)
        weighted_weights = [
            [
                layer * fit_res.num_examples / num_examples_total
                for layer in parameters_to_ndarrays(fit_res.parameters)
            ]
            for _, fit_res in results
        ]

        # Sum across clients
        aggregated = [
            np.sum([w[i] for w in weighted_weights], axis=0)
            for i in range(len(weighted_weights[0]))
        ]

        # Clip gradients to norm C
        for i, param in enumerate(aggregated):
            norm = np.linalg.norm(param)
            if norm > self.clipping_norm:
                aggregated[i] = param * self.clipping_norm / norm

        # Add Gaussian DP noise: N(0, σ²·C²·I)
        noise_std = self.noise_sigma * self.clipping_norm
        aggregated_noisy = [
            param + np.random.normal(0, noise_std, param.shape).astype(param.dtype)
            for param in aggregated
        ]

        # Track privacy budget (per-round epsilon approximation)
        round_epsilon = self.noise_sigma * np.sqrt(2 * np.log(1.25 / self.privacy_delta))
        self._total_epsilon_used += round_epsilon

        self._round_history.append({
            "round": server_round,
            "clients": len(results),
            "round_epsilon": round_epsilon,
            "total_epsilon": self._total_epsilon_used,
            "noise_sigma": self.noise_sigma,
        })

        logger.info(
            "fl.aggregation",
            round=server_round,
            clients=len(results),
            epsilon=f"{self._total_epsilon_used:.3f}/{self.privacy_budget_epsilon}",
        )

        metrics = {
            "round": server_round,
            "privacy_epsilon": self._total_epsilon_used,
            "num_clients": len(results),
        }
        return ndarrays_to_parameters(aggregated_noisy), metrics

    @property
    def round_history(self) -> List[Dict]:
        return self._round_history

    @property
    def privacy_budget_remaining(self) -> float:
        return max(0, self.privacy_budget_epsilon - self._total_epsilon_used)
