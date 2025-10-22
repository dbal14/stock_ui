import React from "react";

const MetricsGrid = ({ metrics = [] }) => {
    const items = metrics.length
        ? metrics
        : [1, 2, 3, 4].map((i) => ({ title: "Metric", value: "--", _placeholder: true }));
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {items.map((m, i) => (
                <div key={m.id ?? i} className="card">
                    <div className="metric">{m.title}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end'}}> 
                    <div className="metric-value">{m.value}</div>
<div
  className={`text-sm text-gray-500 mt-1 margin-top  ${
    String(m.d_change).trim().startsWith('+')
      ? 'color-up'
      : String(m.d_change).trim().startsWith('-')
      ? 'color-down'
      : ''
  }`}
>
  {m.d_change}
</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MetricsGrid;