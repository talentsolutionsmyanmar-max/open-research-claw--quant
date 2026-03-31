"""
Version 1.7 Gene Verification Script
Run: cd ict-trading-dashboard && python scripts/run_v17_verification.py
"""
import sys, os, json

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from backtester import Backtester

# ── Config override dict ──
config_dict = {
    "MODE": "BACKTEST",
    "TIMEFRAME": "1h",
    "BACKTEST_START_DATE": "2024-01-01",
    "BACKTEST_END_DATE": "2025-12-31",
    "INITIAL_CAPITAL": 10000,
    "COMMISSION": 0.001,
    "SLIPPAGE": 0.0005,
}

base_config = Config.from_dict(config_dict)

print("Starting verification on Version 1.7 genes...")
print(f"  Symbols : SOLUSDT, ETHUSDT, BTCUSDT")
print(f"  TF      : {config_dict['TIMEFRAME']}")
print(f"  Range   : {config_dict['BACKTEST_START_DATE']} → {config_dict['BACKTEST_END_DATE']}")
print(f"  Capital : ${config_dict['INITIAL_CAPITAL']:,.0f}")
print()

results = Backtester.run_multi(
    base_config=base_config,
    symbols=["SOLUSDT", "ETHUSDT", "BTCUSDT"],
    timeframe="1h",
    start_date="2024-01-01",
    end_date="2025-12-31",
    initial_capital=10000,
    verbose=True,
    max_workers=1,
)

print("\n=== AGGREGATE RESULTS ===")
print(json.dumps(results.get("aggregate", {}), indent=2))

print("\n=== PER COIN SUMMARY ===")
for coin in results.get("per_coin_summary", []):
    print(coin)
