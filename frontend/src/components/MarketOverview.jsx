import React from "react";

const MetricsGrid = ({ metrics = [] }) => {
  const items = metrics.length
    ? metrics
    : [1, 2, 3, 4].map((i) => ({ title: "Metric", value: "--", _placeholder: true }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((m, i) => {
        const dChange = String(m.d_change || "").trim();
        const isPositive = dChange.startsWith("+");
        const isNegative = dChange.startsWith("-");

        // choose arrow symbol
        const arrow = isPositive ? "▲" : isNegative ? "▼" : "";

        return (
          <div key={m.id ?? i} className="card p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="metric text-gray-600 font-medium">{m.title}</div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <div className="metric-value text-2xl font-semibold text-gray-900">
                {m.value}
              </div>

              {/* Change value with arrow */}
              {dChange && (
                <div
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  <span>{arrow}</span>
                  <span>{dChange}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsGrid;
