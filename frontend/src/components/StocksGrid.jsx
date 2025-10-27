import React, { useEffect, useState } from "react";

export default function StocksGrid({ apiUrl = "http://localhost:4000/api/stocks" }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setStocks(data.stocks || []);
      } catch (err) {
        console.error("Error fetching stocks:", err);
        setError("Failed to load stock data. Please check your Flask server.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [apiUrl]);

  if (loading) {
    return <div className="text-center text-gray-600 mt-8">Loading stock data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 mt-8">{error}</div>;
  }

  if (!stocks.length) {
    return <div className="text-center text-gray-600 mt-8">No stock data available.</div>;
  }

  // helpers
  const parseNumber = (v) => {
    if (v == null || v === "") return NaN;
    if (typeof v === "number") return v;
    const cleaned = String(v).replace(/[%+,\s\[\]]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const isPositive = (val) => {
    const n = parseNumber(val);
    if (Number.isFinite(n)) return n >= 0;
    return typeof val === "string" && val.trim().startsWith("+");
  };

  const formatReturn = (val) => {
    const n = parseNumber(val);
    if (Number.isFinite(n)) {
      const sign = n > 0 ? "+" : n < 0 ? "" : "+";
      return `${sign}${n.toFixed(2)}%`;
    }
    return val ?? "";
  };

  const normalizeFiveDay = (raw) => {
    if (!raw && raw !== 0) return [];
    // if already array
    if (Array.isArray(raw)) {
      return raw.map((r) => {
        const n = parseNumber(r);
        return { n: Number.isFinite(n) ? n : NaN, label: Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : String(r) };
      });
    }
    // if string like "[-1.85, -0.84]"
    if (typeof raw === "string") {
      const matches = raw.match(/-?\d+(\.\d+)?/g);
      if (!matches) return [];
      return matches.map((m) => {
        const n = Number(m);
        return { n: Number.isFinite(n) ? n : NaN, label: Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : m };
      });
    }
    // single value fallback
    const n = parseNumber(raw);
    return [{ n: Number.isFinite(n) ? n : NaN, label: Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : String(raw) }];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {stocks.map((stock, index) => {
        // Accept keys: "5d_return" (string), "five_day" (array), "fiveDay"
        const rawFive = stock["5d_return"] ?? stock.five_day ?? stock.fiveDay ?? [];
        const fiveDay = normalizeFiveDay(rawFive);

        const maxAbs = fiveDay.length ? Math.max(...fiveDay.map((d) => (Number.isFinite(d.n) ? Math.abs(d.n) : 0))) : 1;

        return (
          <div
            key={index}
            className="bg-white shadow-md rounded-2xl p-4 text-center border border-gray-100 hover:shadow-lg transition-all duration-300"
          >
            <h3 className="text-lg font-semibold text-blue-700 mb-3">{stock.name ?? stock.symbol}</h3>

            <div className="flex flex-col items-center gap-2 mt-3">
              {/* 5-day mini bar */}
              {fiveDay.length > 0 ? (
                <div className="flex gap-1 items-end" role="img" aria-label="5 day performance">
                  {fiveDay.map((d, i) => {
                    const val = d.n;
                    const height = Number.isFinite(val) ? Math.max(6, Math.min(18, (Math.abs(val) / (maxAbs || 1)) * 18)) : 8;
                    const colorClass = Number.isFinite(val) ? (val >= 0 ? "bg-green-500" : "bg-red-500") : "bg-gray-300";
                    return (
                      <div
                        key={i}
                        style={{ width: 12, height }}
                        className={`${colorClass} rounded-sm`}
                        title={d.label}
                        aria-label={`Day ${i + 1}: ${d.label}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400">No 5-day data</div>
              )}

              {/* Day / Week / Month */}
              <div className="text-gray-700 flex justify-center items-center gap-6 text-sm mt-2">
                <p>
                  <span className="font-medium">Day:</span>{" "}
                  <span className={isPositive(stock.day_return) ? "text-green-600" : "text-red-600"}>
                    {formatReturn(stock.day_return)}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Week:</span>{" "}
                  <span className={isPositive(stock.weekly_return) ? "text-green-600" : "text-red-600"}>
                    {formatReturn(stock.weekly_return)}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Month:</span>{" "}
                  <span className={isPositive(stock.monthly_return) ? "text-green-600" : "text-red-600"}>
                    {formatReturn(stock.monthly_return)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
