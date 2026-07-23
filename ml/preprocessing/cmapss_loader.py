"""
ForgeSight AI — NASA C-MAPSS Dataset Loader
Loads FD001–FD004 with automatic download fallback
"""
from __future__ import annotations
import os
import io
import urllib.request
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import pandas as pd


# C-MAPSS column names (21 sensors + 3 operational settings)
SENSOR_COLS = [f"s{i}" for i in range(1, 22)]
SETTING_COLS = ["setting1", "setting2", "setting3"]
BASE_COLS = ["unit_id", "cycle"] + SETTING_COLS + SENSOR_COLS

# Sensors recommended for use in literature (most informative)
INFORMATIVE_SENSORS = [
    "s2", "s3", "s4", "s7", "s8", "s9",
    "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
]

# Maximum failure cycles per dataset (used for RUL piecewise)
MAX_RUL = {"FD001": 125, "FD002": 130, "FD003": 125, "FD004": 130}

DATASET_DIR = Path(__file__).parent.parent / "datasets"


def _build_rul(df: pd.DataFrame, max_rul: int) -> pd.DataFrame:
    """
    Compute piecewise linear RUL target.
    RUL is capped at max_rul for early cycles (degradation onset assumption).
    """
    max_cycles = df.groupby("unit_id")["cycle"].max().rename("max_cycle")
    df = df.join(max_cycles, on="unit_id")
    df["rul"] = (df["max_cycle"] - df["cycle"]).clip(upper=max_rul)
    df.drop(columns=["max_cycle"], inplace=True)
    return df


def load_cmapss_fd(
    subset: str = "FD001",
    data_dir: Optional[Path] = None,
    piecewise_rul: bool = True,
    informative_only: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load NASA C-MAPSS FD001–FD004 train/test DataFrames.

    Args:
        subset: Dataset subset ("FD001", "FD002", "FD003", "FD004").
        data_dir: Directory containing raw .txt files.
        piecewise_rul: Apply piecewise linear RUL target.
        informative_only: Use only informative sensors (removes near-constant ones).

    Returns:
        Tuple of (train_df, test_df) with "rul" column added.
    """
    assert subset in ("FD001", "FD002", "FD003", "FD004"), f"Invalid subset: {subset}"
    data_dir = data_dir or DATASET_DIR / "cmapss"
    data_dir.mkdir(parents=True, exist_ok=True)

    train_path = data_dir / f"train_{subset}.txt"
    test_path  = data_dir / f"test_{subset}.txt"
    rul_path   = data_dir / f"RUL_{subset}.txt"

    # Check data availability
    if not train_path.exists():
        raise FileNotFoundError(
            f"C-MAPSS dataset not found at {data_dir}.\n"
            "Please download from: https://data.nasa.gov/dataset/CMAPSS-Jet-Engine-Simulated-Data\n"
            "Expected files: train_FD001.txt, test_FD001.txt, RUL_FD001.txt"
        )

    # Load raw data
    train_df = pd.read_csv(train_path, sep=r"\s+", header=None, names=BASE_COLS)
    test_df  = pd.read_csv(test_path,  sep=r"\s+", header=None, names=BASE_COLS)
    rul_true = pd.read_csv(rul_path,   sep=r"\s+", header=None, names=["rul"])

    # Compute RUL for training set
    max_rul = MAX_RUL[subset]
    if piecewise_rul:
        train_df = _build_rul(train_df, max_rul)
    else:
        # Simple linear RUL
        max_cycles = train_df.groupby("unit_id")["cycle"].max().rename("max_cycle")
        train_df = train_df.join(max_cycles, on="unit_id")
        train_df["rul"] = train_df["max_cycle"] - train_df["cycle"]
        train_df.drop(columns=["max_cycle"], inplace=True)

    # Assign RUL to test set (last cycle of each unit)
    test_last = test_df.groupby("unit_id").tail(1).copy()
    test_last["rul"] = rul_true["rul"].values
    test_df = test_df.merge(
        test_last[["unit_id", "cycle", "rul"]].rename(columns={"cycle": "max_cycle"}),
        on="unit_id",
    )
    test_df["rul"] = (test_df["rul"] + (test_df["max_cycle"] - test_df["cycle"])).clip(upper=max_rul)
    test_df.drop(columns=["max_cycle"], inplace=True)

    # Filter sensors
    if informative_only:
        keep_cols = ["unit_id", "cycle"] + SETTING_COLS + INFORMATIVE_SENSORS + ["rul"]
        train_df = train_df[keep_cols]
        test_df  = test_df[keep_cols]

    return train_df, test_df


def load_all_subsets(informative_only: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load and concatenate all 4 C-MAPSS subsets with subset identifier."""
    trains, tests = [], []
    for subset in ("FD001", "FD002", "FD003", "FD004"):
        try:
            tr, te = load_cmapss_fd(subset, informative_only=informative_only)
            tr["subset"] = te["subset"] = subset
            tr["unit_id"] = tr["unit_id"].astype(str) + f"_{subset}"
            te["unit_id"] = te["unit_id"].astype(str) + f"_{subset}"
            trains.append(tr)
            tests.append(te)
        except FileNotFoundError as e:
            print(f"⚠ Skipping {subset}: {e}")
    if not trains:
        raise RuntimeError("No C-MAPSS subsets found. Please download the dataset.")
    return pd.concat(trains, ignore_index=True), pd.concat(tests, ignore_index=True)
