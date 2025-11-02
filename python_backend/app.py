from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import pandas as pd
from metrics import sample_metrics
import os
from stocks import load_stocks_df,build_stocks_payload
import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
import json, os, threading
from flask import request, Response
app = Flask(__name__)
CORS(app)

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "metrics": sample_metrics(),
    })

CSV_PATH = os.environ.get("CSV_PATH", r"C:\Users\deepa\Downloads\data1.csv")
# load once
STOCKS_DF = load_stocks_df(CSV_PATH)
@app.route("/api/stocks")
def get_stocks():
    # read optional query params
    tickers_q = request.args.get("tickers", default=None, type=str)
    n = request.args.get("n", default=None, type=int)
    payload = build_stocks_payload(STOCKS_DF, CSV_PATH, tickers_q=tickers_q, n=n)
    return jsonify(payload)

path=r"D:\dashboard\dashboard_project_full_data\dashboard_project_python_only\all_data\day_week_month_summery.csv"
@app.route("/api/summary", methods=["GET"])
def get_summary():
    try:
        df = pd.read_csv(path)
        data = df.to_dict(orient='records')
        return jsonify({"summary": data, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500

# --- Watchlist API (file-based persistence) ---
WATCHLIST_PATH = r"D:\dashboard\dashboard_project_full_data\dashboard_project_python_only\all_data\watchlist.json"
_lock = threading.Lock()

def _load_watchlist():
    if not os.path.exists(WATCHLIST_PATH):
        return []
    with open(WATCHLIST_PATH, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return []

def _save_watchlist(symbols):
    tmp = WATCHLIST_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sorted(set(symbols)), f)
    os.replace(tmp, WATCHLIST_PATH)

@app.route("/api/watchlist", methods=["GET", "POST", "DELETE"])
def watchlist():
    with _lock:
        if request.method == "GET":
            return jsonify({"symbols": _load_watchlist()})
        if request.method == "POST":
            sym = (request.json or {}).get("symbol", "").strip().upper()
            if not sym: return jsonify({"ok": False, "error": "symbol required"}), 400
            items = set(_load_watchlist()); items.add(sym); _save_watchlist(list(items))
            return jsonify({"ok": True, "symbols": sorted(items)})
        sym = (request.json or {}).get("symbol", "").strip().upper()
        items = [s for s in _load_watchlist() if s != sym] if sym else []
        _save_watchlist(items)
        return jsonify({"ok": True, "symbols": items})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
