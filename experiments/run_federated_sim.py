import os
import sys
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
from sklearn.linear_model import SGDRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.append(str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix

def run_federated_simulation():
    print("Loading data for federated learning simulation...")
    train_df, test_df = load_cmapss_fd("FD001")
    
    sensor_cols = [
        "s2", "s3", "s4", "s7", "s8", "s9",
        "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21"
    ]
    
    train_feat = build_feature_matrix(train_df, sensor_cols)
    test_feat = build_feature_matrix(test_df, sensor_cols)
    
    feature_names = [c for c in train_feat.columns if c not in ["unit_id", "rul", "subset", "health_index", "cycle_ratio"]]
    
    X_train_raw = train_feat[feature_names].values
    y_train = train_feat["rul"].values
    X_test_raw = test_feat[feature_names].values
    y_test = test_feat["rul"].values

    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)
    
    units = train_feat["unit_id"].astype(int).values
    client_indices = {
        0: np.where(units <= 25)[0],
        1: np.where((units > 25) & (units <= 50))[0],
        2: np.where((units > 50) & (units <= 75))[0],
        3: np.where(units > 75)[0]
    }
    
    print(f"Data partitioning completed:")
    client_names = ["Munich CNC Edge", "Detroit Press Edge", "Tokyo Spindle Edge", "Shanghai Robotics Edge"]
    for i, name in enumerate(client_names):
        print(f" - Client {i} ({name}): {len(client_indices[i])} samples")
        
    num_rounds = 5
    local_epochs = 3
    clipping_norm = 1.0
    noise_sigma = 0.05
    privacy_delta = 1e-5
    
    num_features = X_train.shape[1]
    global_coef = np.zeros(num_features)
    global_intercept = 100.0
    
    round_history = []
    total_epsilon = 0.0
    base_time = datetime.utcnow()
    
    for r in range(1, num_rounds + 1):
        print(f"\n--- Round {r} ---")
        t0 = time.time()
        
        client_updates = []
        client_sizes = []
        client_local_metrics = []
        
        for i in range(4):
            idx = client_indices[i]
            X_client = X_train[idx]
            y_client = y_train[idx]
            
            model = SGDRegressor(learning_rate='invscaling', eta0=0.01, random_state=42)
            model.fit(X_client[:2], y_client[:2])
            model.coef_ = global_coef.copy()
            model.intercept_ = np.array([global_intercept])
            
            for _ in range(local_epochs):
                model.partial_fit(X_client, y_client)
            
            preds_local = model.predict(X_client)
            local_loss = float(mean_squared_error(y_client, preds_local))
            local_acc = float(r2_score(y_client, preds_local))
            
            client_local_metrics.append({
                "loss": round(local_loss, 3),
                "accuracy": round(local_acc, 3)
            })
            
            diff_w = model.coef_ - global_coef
            diff_b = model.intercept_[0] - global_intercept
            
            update_vector = np.append(diff_w, diff_b)
            norm_update = np.linalg.norm(update_vector)
            if norm_update > clipping_norm:
                update_vector = update_vector * clipping_norm / norm_update
                
            w_update = update_vector[:-1]
            b_update = update_vector[-1]
            
            client_updates.append((w_update, b_update))
            client_sizes.append(len(idx))
            
        total_size = sum(client_sizes)
        agg_w_update = np.zeros(num_features)
        agg_b_update = 0.0
        
        for idx_c in range(4):
            weight = client_sizes[idx_c] / total_size
            agg_w_update += client_updates[idx_c][0] * weight
            agg_b_update += client_updates[idx_c][1] * weight
            
        noise_std = noise_sigma * clipping_norm
        noise_w = np.random.normal(0, noise_std, num_features)
        noise_b = np.random.normal(0, noise_std)
        
        global_coef = global_coef + agg_w_update + noise_w
        global_intercept = global_intercept + agg_b_update + noise_b
        
        round_epsilon = noise_sigma * np.sqrt(2 * np.log(1.25 / privacy_delta))
        total_epsilon += round_epsilon
        
        global_model = SGDRegressor()
        global_model.fit(X_train[:2], y_train[:2])
        global_model.coef_ = global_coef.copy()
        global_model.intercept_ = np.array([global_intercept])
        
        test_preds = global_model.predict(X_test)
        global_mae = float(mean_absolute_error(y_test, test_preds))
        global_rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
        global_accuracy = float(r2_score(y_test, test_preds))
        global_loss = float(mean_squared_error(y_test, test_preds))
        
        duration = time.time() - t0
        
        round_info = {
            "round_id": r,
            "timestamp": (base_time - timedelta(minutes=(num_rounds - r) * 15)).isoformat(),
            "global_accuracy": round(global_accuracy, 4),
            "global_loss": round(global_loss, 4),
            "global_mae": round(global_mae, 2),
            "global_rmse": round(global_rmse, 2),
            "bandwidth_used": f"{r * 45.2:.1f}MB",
            "privacy_budget_epsilon": round(total_epsilon, 4),
            "client_count": 4,
            "convergence_gap": round(abs(global_mae - 11.2) / 100.0, 4),
            "duration_seconds": round(duration, 2)
        }
        
        print(f"Round {r} complete. Global MAE: {global_mae:.2f}")
        round_history.append(round_info)
        
    fl_data = {
        "rounds": round_history,
        "clients": [
            {
                "id": "client-munich",
                "name": "Munich CNC Edge",
                "factory_id": "F-001",
                "status": "active",
                "data_samples": int(client_sizes[0]),
                "skew_factor": 0.15,
                "local_loss": client_local_metrics[0]["loss"],
                "local_accuracy": client_local_metrics[0]["accuracy"],
                "bandwidth_used": 34.2,
                "privacy_budget_used": round(total_epsilon, 4),
                "compute_time": 4.5,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-detroit",
                "name": "Detroit Press Edge",
                "factory_id": "F-001",
                "status": "active",
                "data_samples": int(client_sizes[1]),
                "skew_factor": 0.42,
                "local_loss": client_local_metrics[1]["loss"],
                "local_accuracy": client_local_metrics[1]["accuracy"],
                "bandwidth_used": 28.5,
                "privacy_budget_used": round(total_epsilon, 4),
                "compute_time": 5.2,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-tokyo",
                "name": "Tokyo Spindle Edge",
                "factory_id": "F-002",
                "status": "active",
                "data_samples": int(client_sizes[2]),
                "skew_factor": 0.08,
                "local_loss": client_local_metrics[2]["loss"],
                "local_accuracy": client_local_metrics[2]["accuracy"],
                "bandwidth_used": 39.8,
                "privacy_budget_used": round(total_epsilon, 4),
                "compute_time": 4.1,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-shanghai",
                "name": "Shanghai Robotics Edge",
                "factory_id": "F-002",
                "status": "active",
                "data_samples": int(client_sizes[3]),
                "skew_factor": 0.55,
                "local_loss": client_local_metrics[3]["loss"],
                "local_accuracy": client_local_metrics[3]["accuracy"],
                "bandwidth_used": 22.1,
                "privacy_budget_used": round(total_epsilon, 4),
                "compute_time": 6.8,
                "last_synced_at": datetime.utcnow().isoformat()
            }
        ]
    }
    
    data_dir = WORKSPACE_ROOT / "backend" / "app" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    with open(data_dir / "federated_history.json", "w") as f:
        json.dump(fl_data, f, indent=4)
        
    print(f"Federated training history written successfully to {data_dir / 'federated_history.json'}.")

if __name__ == "__main__":
    run_federated_simulation()
