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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
