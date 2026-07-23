"""
ForgeSight AI — Counterfactual Optimization Verification
"""
import json
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from backend.app.services.xai_engine import calculate_counterfactual
from backend.app.services.ml_engine import get_registry


def run_counterfactual(verbose: bool = True):
    registry = get_registry()
    if not registry.is_ready:
        print("Models not loaded. Run run_training.py first.")
        return

    results_dir = WORKSPACE_ROOT / "experiments" / "results"
    results_dir.mkdir(exist_ok=True)

    if verbose:
        print("=" * 60)
        print("ForgeSight AI — Counterfactual Verification")
        print("=" * 60)

    # Initial state (from baseline sensors)
    # [speed, torque, wear, temperature, vibration]
    initial_features = [1500.0, 45.0, 80.0, 75.0, 4.5]
    target_rul = 80.0

    if verbose:
        print(f"Target RUL: {target_rul} cycles")
        print("Running scipy L-BFGS-B optimization...")

    res = calculate_counterfactual("M-001", target_rul, initial_features)

    if verbose:
        print(f"\nOriginal RUL: {res['original_rul']} cycles")
        print(f"Achieved RUL: {res['achieved_rul']} cycles")
        print(f"Converged in: {res['optimization_iterations']} iterations")
        print("\nRecommended Actions:")
        for ch in res['changes']:
            print(f"  - {ch['feature']}: {ch['original_value']} -> {ch['counterfactual_value']} ({ch['delta']:+.2f} {ch['unit']})")

    with open(results_dir / "counterfactual_results.json", "w") as f:
        json.dump(res, f, indent=2)

    return res


if __name__ == "__main__":
    run_counterfactual()
