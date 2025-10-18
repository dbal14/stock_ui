from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

def sample_metrics():
    return [
        {"title": "Nifty50", "value": "34,150"},
        {"title": "Sensex", "value": "15,256"},
        {"title": "Market Cap", "value": "31,250"},
        {"title": "Visitors", "value": "15,803"},
        {"title": "Active Users", "value": "8,432"},
        {"title": "New Signups", "value": "1,245"}
    ]

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "metrics": sample_metrics(),
        # timeseries can be used elsewhere
        "timeseries": [
            {"name": "Week 1", "uv": 200},
            {"name": "Week 2", "uv": 300},
            {"name": "Week 3", "uv": 500},
            {"name": "Week 4", "uv": 700},
            {"name": "Week 5", "uv": 650},
            {"name": "Week 6", "uv": 720}
        ],
        "pie": [
            {"name": "Completed", "value": 71},
            {"name": "Remaining", "value": 29}
        ]
    })

@app.route("/api/weekly")
def weekly():
    # Bar: daily values for a week
    bar = [
      {"name": "Mon", "value": 12},
      {"name": "Tue", "value": 18},
      {"name": "Wed", "value": 9},
      {"name": "Thu", "value": 14},
      {"name": "Fri", "value": 21},
      {"name": "Sat", "value": 7},
      {"name": "Sun", "value": 5}
    ]

    # Line: 12 weeks of trend data
    line = [{"name": f"Week {i+1}", "uv": random.randint(100, 900)} for i in range(12)]

    # Pie: multiple categories for order completion / status
    pie = [
      {"name": "Completed", "value": 58},
      {"name": "Pending", "value": 22},
      {"name": "Cancelled", "value": 12},
      {"name": "Refunded", "value": 8}
    ]

    # Sales analytics: monthly categories (used if frontend expects sales data)
    sales = [{"name": datetime.utcnow().strftime('%b %Y'), "sales": random.randint(1000,5000)} for _ in range(6)]
    for i in range(6):
        sales[i]["name"] = (datetime.utcnow() - timedelta(weeks=4*(5-i))).strftime('%b %Y')

    # Sample invoices (if frontend wants them)
    invoices = [
        {"id": "INV-1001", "amount": 230, "status": "paid", "date": "2025-10-01"},
        {"id": "INV-1002", "amount": 540, "status": "pending", "date": "2025-10-03"},
        {"id": "INV-1003", "amount": 410, "status": "paid", "date": "2025-10-04"},
        {"id": "INV-1004", "amount": 290, "status": "overdue", "date": "2025-10-06"}
    ]

    return jsonify({
        "bar": bar,
        "line": line,
        "pie": pie,
        "sales": sales,
        "invoices": invoices
    })

@app.route("/api/random_timeseries")
def random_timeseries():
    today = datetime.utcnow().date()
    data = []
    for i in range(30):
        day = today - timedelta(days=29-i)
        data.append({
            "date": day.isoformat(),
            "value": random.randint(50, 200)
        })
    return jsonify({"series": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
