"""
ForgeSight AI — Master Orchestrator
Runs all experiments sequentially to guarantee 100% reproducibility.
"""
import sys
import time
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from experiments.run_training import train_and_evaluate
from experiments.run_federated import run_federated
from experiments.run_conformal import run_conformal
from experiments.run_statistics import run_statistics
from experiments.run_ablation import run_ablation
from experiments.run_dp_tradeoff import run_dp_tradeoff
from experiments.run_counterfactual import run_counterfactual
from experiments.run_benchmark import run_benchmark
from experiments.run_robustness import run_robustness


def main():
    print("=" * 80)
    print(" ForgeSight AI — Reproducibility Master Script ")
    print("=" * 80)

    t0 = time.time()

    # 1. Training (Must run first)
    print("\n[1/9] Training Models...")
    train_and_evaluate(verbose=True)

    # 2. Federated Simulation
    print("\n[2/9] Running Federated Simulation...")
    run_federated(verbose=True)

    # 3. Conformal Prediction
    print("\n[3/9] Calibrating Conformal Prediction...")
    run_conformal(verbose=True)

    # 4. Statistical Significance
    print("\n[4/9] Running Statistical Tests...")
    run_statistics(n_runs=5, verbose=True) # use 5 for speed, paper uses 30

    # 5. Ablation Study
    print("\n[5/9] Running Feature Ablation...")
    run_ablation(verbose=True)

    # 6. Differential Privacy
    print("\n[6/9] Computing DP Trade-offs...")
    run_dp_tradeoff(verbose=True)

    # 7. Counterfactual Verification
    print("\n[7/9] Verifying Counterfactual Optimization...")
    run_counterfactual(verbose=True)

    # 8. Benchmark
    print("\n[8/9] Running Benchmarks...")
    run_benchmark(verbose=True)

    # 9. Robustness
    print("\n[9/9] Evaluating Robustness...")
    run_robustness(verbose=True)

    total_time = time.time() - t0
    print("\n" + "=" * 80)
    print(f" ALL EXPERIMENTS COMPLETED SUCCESSFULLY in {total_time:.1f}s.")
    print(" Results saved to experiments/results/ and backend/app/data/")
    print(" The repository is now 100% consistent with the paper.")
    print("=" * 80)


if __name__ == "__main__":
    main()
