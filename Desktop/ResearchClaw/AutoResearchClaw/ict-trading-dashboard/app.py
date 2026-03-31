from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import threading

from backtester import Backtester
from paper_trader import PaperTrader
from config import build_config
from regime import detect_regime
from run_store import insert_run, list_runs, get_run
from research_suggest import build_suggestion, config_snapshot
from unusual_whales_client import UnusualWhalesClient
from health_service import get_health_snapshot
from session_clock import get_session_state
from strategy.load_spec import public_spec_dict
from risk_engine import RiskEngine
from trade_playbook import list_playbook_events
from research_lab import (
    walk_forward_oos,
    stress_crisis_windows,
    run_evolution,
    CRISIS_WINDOWS,
    apply_research_genes,
    runtime_gene_snapshot,
    copy_research_genes,
)
from kz_research_store import list_kz_runs
from kz_autoresearch import run_kz_research_once, start_background_poller
import os
import subprocess

ALLOWED_TIMEFRAMES = frozenset(
    {
        "1m",
        "3m",
        "5m",
        "15m",
        "30m",
        "1h",
        "2h",
        "4h",
        "6h",
        "8h",
        "12h",
        "1d",
        "3d",
        "1w",
    }
)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "autoresearchclaw-dev-secret")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


# Global state
trading_state = {
    "mode": "BACKTEST",
    "is_running": False,
    "current_signal": None,
    "live_metrics": {},
}

config = build_config()
paper_trader = None
risk_engine = RiskEngine(config)


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/live")
def live_watch():
    """Dedicated multi-symbol live view (same Socket.IO feed as dashboard)."""
    return render_template("live_watch.html")


@app.route("/api/backtest", methods=["POST"])
def run_backtest():
    """Run backtest and return results"""
    try:
        payload = request.get_json(silent=True) or {}

        # Fresh spec + in-session genes (Apply from Research lab), then request overrides.
        run_config = build_config()
        copy_research_genes(config, run_config)
        if "start_date" in payload:
            run_config.BACKTEST_START_DATE = payload["start_date"]
        if "end_date" in payload:
            run_config.BACKTEST_END_DATE = payload["end_date"]
        if "initial_capital" in payload:
            run_config.INITIAL_CAPITAL = float(payload["initial_capital"])
        if "symbol" in payload and payload["symbol"]:
            run_config.SYMBOL = str(payload["symbol"]).upper().replace("/", "")
        tf = payload.get("timeframe") or payload.get("interval")
        if tf and str(tf) in ALLOWED_TIMEFRAMES:
            run_config.TIMEFRAME = str(tf)

        results = Backtester(run_config).run()
        # Ensure diagnostics print immediately (debug server + reloader can buffer stdout)
        try:
            subprocess.run(["/bin/sh", "-lc", "true"], check=False)
        except Exception:
            pass

        df = results["df"].copy()
        signals_df = df[["signal", "signal_strength"]].tail(100).copy()

        n = len(df)
        step = max(1, n // 800)
        chart_slice = df.iloc[::step]
        price_bars = []
        for _, row in chart_slice.iterrows():
            ts = row["timestamp"]
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            price_bars.append(
                {
                    "t": ts_str,
                    "o": float(row["open"]),
                    "h": float(row["high"]),
                    "l": float(row["low"]),
                    "c": float(row["close"]),
                }
            )

        eq = results["equity_curve"]
        equity_sample = eq[:: max(1, len(eq) // 400)] if eq else []

        regime = detect_regime(df)
        try:
            run_id = insert_run(
                symbol=run_config.SYMBOL,
                timeframe=run_config.TIMEFRAME,
                start_date=run_config.BACKTEST_START_DATE,
                end_date=run_config.BACKTEST_END_DATE,
                initial_capital=float(run_config.INITIAL_CAPITAL),
                regime=regime,
                metrics=results["metrics"],
                config_snapshot=config_snapshot(run_config),
            )
        except Exception as persist_err:
            run_id = None
            print(f"Run store warning: {persist_err}")

        response = {
            "success": True,
            "run_id": run_id,
            "regime": regime,
            "metrics": results["metrics"],
            "trades": results["trades"][-20:],
            "equity_curve": equity_sample,
            "signals": signals_df.to_dict("records"),
            "price_bars": price_bars,
            "meta": {
                "symbol": run_config.SYMBOL,
                "timeframe": run_config.TIMEFRAME,
            },
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/paper/start", methods=["POST"])
def start_paper_trading():
    """Start paper trading"""
    global paper_trader

    if trading_state["is_running"]:
        return jsonify({"success": False, "error": "Already running"})

    allow, reasons = risk_engine.allow_new_risk(mode="PAPER", symbol=config.SYMBOL)
    if not allow:
        return jsonify({"success": False, "error": reasons[0] if reasons else "Risk gate blocked"}), 403

    paper_trader = PaperTrader(config, socketio)
    trading_state["is_running"] = True
    trading_state["mode"] = "PAPER"

    thread = threading.Thread(target=paper_trader.run, daemon=True)
    thread.start()

    return jsonify({"success": True, "message": "Paper trading started"})


@app.route("/api/paper/stop", methods=["POST"])
def stop_paper_trading():
    """Stop paper trading"""
    global paper_trader

    if paper_trader:
        paper_trader.stop()

    trading_state["is_running"] = False
    trading_state["mode"] = "BACKTEST"

    return jsonify({"success": True, "message": "Paper trading stopped"})


@app.route("/api/status")
def get_status():
    return jsonify(trading_state)


@app.route("/api/health")
def api_health():
    snap = get_health_snapshot(config.BINANCE_API)
    return jsonify({"success": True, **snap})


@app.route("/api/session")
def api_session():
    return jsonify({"success": True, "session": get_session_state()})


@app.route("/api/strategy-spec")
def api_strategy_spec():
    return jsonify({"success": True, "spec": public_spec_dict()})


@app.route("/api/risk-check")
def api_risk_check():
    mode = request.args.get("mode", "PAPER").upper()
    ok, reasons = risk_engine.allow_new_risk(mode=mode, symbol=config.SYMBOL)
    return jsonify({"success": True, "allow": ok, "reasons": reasons})


@app.route("/api/playbook")
def api_playbook():
    try:
        limit = int(request.args.get("limit", 40))
    except ValueError:
        limit = 40
    sym = request.args.get("symbol")
    sym = sym.strip().upper().replace("/", "") if sym else None
    rows = list_playbook_events(limit=limit, symbol=sym)
    return jsonify({"success": True, "events": rows, "watchlist": getattr(config, "WATCHLIST", None) or []})


@app.route("/api/runs")
def api_list_runs():
    try:
        limit = int(request.args.get("limit", 20))
    except ValueError:
        limit = 20
    return jsonify({"success": True, "runs": list_runs(limit=limit)})


@app.route("/api/runs/<int:run_id>")
def api_get_run(run_id: int):
    row = get_run(run_id)
    if not row:
        return jsonify({"success": False, "error": "Not found"}), 404
    return jsonify({"success": True, "run": row})


@app.route("/api/research/suggest", methods=["POST"])
def api_research_suggest():
    payload = request.get_json(silent=True) or {}
    use_llm = bool(payload.get("use_llm"))
    try:
        lim = int(payload.get("history_limit", 12))
    except ValueError:
        lim = 12
    recent = list_runs(limit=max(5, min(lim, 50)))
    out = build_suggestion(recent, use_llm=use_llm)
    return jsonify({"success": True, **out})


def _research_payload():
    """Shared JSON body for lab endpoints (same shape as backtest)."""
    p = request.get_json(silent=True) or {}
    symbol = str(p.get("symbol") or config.SYMBOL).upper().replace("/", "")
    tf = str(p.get("timeframe") or p.get("interval") or config.TIMEFRAME)
    if tf not in ALLOWED_TIMEFRAMES:
        tf = config.TIMEFRAME
    start = str(p.get("start_date") or config.BACKTEST_START_DATE)
    end = str(p.get("end_date") or config.BACKTEST_END_DATE)
    try:
        cap = float(p.get("initial_capital", config.INITIAL_CAPITAL))
    except (TypeError, ValueError):
        cap = float(config.INITIAL_CAPITAL)
    return p, symbol, tf, start, end, cap


@app.route("/api/research/crisis-windows")
def api_research_crisis_windows():
    return jsonify({"success": True, "windows": CRISIS_WINDOWS})


@app.route("/api/research/walk-forward", methods=["POST"])
def api_research_walk_forward():
    """70/30 (configurable) train vs held-out test; composite fitness OOS-weighted."""
    try:
        p, symbol, tf, start, end, cap = _research_payload()
        try:
            train_frac = float(p.get("train_frac", 0.7))
        except (TypeError, ValueError):
            train_frac = 0.7
        train_frac = max(0.5, min(train_frac, 0.9))
        out = walk_forward_oos(
            symbol=symbol,
            timeframe=tf,
            start_date=start,
            end_date=end,
            initial_capital=cap,
            train_frac=train_frac,
            runtime_cfg=config,
        )
        return jsonify({"success": True, **out})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/research/stress", methods=["POST"])
def api_research_stress():
    """Backtest current strategy genes on fixed crisis date slices (crypto stress library)."""
    try:
        _, symbol, tf, _, _, cap = _research_payload()
        out = stress_crisis_windows(symbol=symbol, timeframe=tf, initial_capital=cap, cfg=config)
        return jsonify({"success": True, **out})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/research/evolve", methods=["POST"])
def api_research_evolve():
    """
    Small evolutionary search over ICT genes; fast fitness = OOS-weighted composite.
    Top genomes re-scored with crisis windows included (expensive).
    """
    try:
        p, symbol, tf, start, end, cap = _research_payload()
        try:
            population = int(p.get("population", 10))
        except ValueError:
            population = 10
        try:
            generations = int(p.get("generations", 2))
        except ValueError:
            generations = 2
        population = max(4, min(population, 18))
        generations = max(1, min(generations, 4))
        try:
            seed = int(p["seed"]) if p.get("seed") is not None else None
        except (TypeError, ValueError):
            seed = None
        try:
            top_k = int(p.get("verify_top_k", 3))
        except ValueError:
            top_k = 3
        top_k = max(1, min(top_k, 5))
        out = run_evolution(
            symbol=symbol,
            timeframe=tf,
            start_date=start,
            end_date=end,
            initial_capital=cap,
            population=population,
            generations=generations,
            seed=seed,
            verify_top_k_crisis=top_k,
            runtime_cfg=config,
            symbols=p.get("symbols") if isinstance(p.get("symbols"), list) else None,
        )
        return jsonify({"success": True, **out})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/research/kz-runs")
def api_research_kz_runs():
    """History of kill-zone-triggered autoresearch runs (SQLite). Use detail=1 for full JSON blobs."""
    try:
        lim = int(request.args.get("limit", 30))
    except ValueError:
        lim = 30
    rows = list_kz_runs(limit=lim)
    detail = request.args.get("detail", "").lower() in ("1", "true", "yes")
    if not detail:
        drop = frozenset(
            {"history_json", "top_json", "history_parsed", "top_parsed"}
        )
        rows = [{k: v for k, v in dict(r).items() if k not in drop} for r in rows]
    return jsonify({"success": True, "runs": rows})


@app.route("/api/research/kz-run-now", methods=["POST"])
def api_research_kz_run_now():
    """Fire one KZ-style research job immediately (same pipeline as exit trigger, manual tag)."""
    body = request.get_json(silent=True) or {}
    tag = str(body.get("tag") or "manual")
    ze = body.get("zones_exited")
    if ze is not None and not isinstance(ze, list):
        return jsonify({"success": False, "error": "zones_exited must be a list"}), 400
    out = run_kz_research_once(config, force_tag=tag, zones_exited=ze)
    if out.get("skipped"):
        return jsonify({"success": False, **out}), 409
    return jsonify(
        {
            "success": True,
            "run_id": out.get("run_id"),
            "trigger_tag": out.get("trigger_tag"),
            "error": out.get("error"),
        }
    )


@app.route("/api/config/runtime")
def api_config_runtime():
    """ICT genes + symbol/tf actually used for backtest, paper, and research lab (may differ from spec.yaml on disk)."""
    return jsonify(
        {
            "success": True,
            "genes": runtime_gene_snapshot(config),
            "symbol": config.SYMBOL,
            "timeframe": config.TIMEFRAME,
            "initial_capital": config.INITIAL_CAPITAL,
            "watchlist": getattr(config, "WATCHLIST", None) or [],
            "note": "Runtime state until you Reset or restart Flask. Edit strategy/spec.yaml + restart to persist.",
        }
    )


@app.route("/api/config/apply-genes", methods=["POST"])
def api_config_apply_genes():
    """Apply lab genes to running process (next paper session + research + manual backtest uses build_config per request — see note)."""
    global config, risk_engine
    if trading_state.get("is_running"):
        return jsonify({"success": False, "error": "Stop paper trading before changing genes."}), 409
    body = request.get_json(silent=True) or {}
    if body.get("reset") is True:
        config = build_config()
        risk_engine = RiskEngine(config)
        return jsonify(
            {
                "success": True,
                "applied": {"action": "reset_from_spec_yaml"},
                "runtime": {
                    "genes": runtime_gene_snapshot(config),
                    "symbol": config.SYMBOL,
                    "timeframe": config.TIMEFRAME,
                },
            }
        )

    genes = body.get("genes")
    if not isinstance(genes, dict):
        return jsonify({"success": False, "error": "Missing object: genes"}), 400
    errs = apply_research_genes(config, genes)
    if errs:
        return jsonify({"success": False, "errors": errs}), 400

    sym = body.get("symbol")
    if sym and str(sym).strip():
        config.SYMBOL = str(sym).upper().replace("/", "")
    tf = body.get("timeframe") or body.get("interval")
    if tf and str(tf) in ALLOWED_TIMEFRAMES:
        config.TIMEFRAME = str(tf)
    if body.get("initial_capital") is not None:
        try:
            config.INITIAL_CAPITAL = float(body["initial_capital"])
        except (TypeError, ValueError):
            pass

    risk_engine = RiskEngine(config)
    return jsonify(
        {
            "success": True,
            "applied": {"genes": genes, "symbol": config.SYMBOL, "timeframe": config.TIMEFRAME},
            "runtime": {
                "genes": runtime_gene_snapshot(config),
                "symbol": config.SYMBOL,
                "timeframe": config.TIMEFRAME,
            },
        }
    )


@app.route("/api/uw/status")
def api_uw_status():
    """Unusual Whales API key present (same data family as their MCP server)."""
    c = UnusualWhalesClient(config)
    return jsonify({"success": True, "configured": c.configured})


@app.route("/api/uw/market-tide")
def api_uw_market_tide():
    c = UnusualWhalesClient(config)
    if not c.configured:
        return jsonify({"success": False, "error": "Set UNUSUAL_WHALES_API_KEY in .env"}), 503
    try:
        interval_5m = request.args.get("interval_5m", "false").lower() in ("1", "true", "yes")
        payload = c.market_tide(interval_5m=interval_5m)
        return jsonify({"success": True, "payload": payload})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/uw/flow-recent/<ticker>")
def api_uw_flow_recent(ticker: str):
    c = UnusualWhalesClient(config)
    if not c.configured:
        return jsonify({"success": False, "error": "Set UNUSUAL_WHALES_API_KEY in .env"}), 503
    try:
        payload = c.flow_recent(ticker)
        return jsonify({"success": True, "payload": payload})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/uw/flow-alerts")
def api_uw_flow_alerts():
    c = UnusualWhalesClient(config)
    if not c.configured:
        return jsonify({"success": False, "error": "Set UNUSUAL_WHALES_API_KEY in .env"}), 503
    try:
        limit = int(request.args.get("limit", 15))
        limit = max(1, min(limit, 50))
        ticker = request.args.get("ticker") or request.args.get("ticker_symbol")
        min_prem = request.args.get("min_premium")
        min_premium = int(min_prem) if min_prem and str(min_prem).isdigit() else None
        payload = c.flow_alerts(
            ticker_symbol=ticker,
            limit=limit,
            min_premium=min_premium,
            is_otm=True if request.args.get("is_otm", "").lower() in ("1", "true", "yes") else None,
        )
        return jsonify({"success": True, "payload": payload})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502


@socketio.on("connect")
def handle_connect():
    print("Client connected")
    emit("connection", {"data": "Connected to AutoResearchClaw"})


@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")


if __name__ == "__main__":
    # Default 5050: macOS often binds 5000 to AirPlay Receiver (System Settings → General → AirDrop & Handoff).
    port = int(os.getenv("PORT", "5050"))
    print(f"AutoResearchClaw: http://127.0.0.1:{port}/  (set PORT= to override)")
    _kz = os.getenv("KZ_AUTO_RESEARCH", "").strip().lower()
    if _kz in ("1", "true", "yes", "on"):
        start_background_poller(lambda: config, interval_sec=float(os.getenv("KZ_POLL_INTERVAL_SEC", "60")))
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)

