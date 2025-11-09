// src/components/PeopleStocksDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981"];
const POS = "#16a34a", NEG = "#dc2626", NEU = "#6b7280";

// Optional nicer names
const STOCK_LABELS = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  HDFCBANK: "HDFC Bank",
  INFY: "Infosys",
  ICICIBANK: "ICICI Bank",
  ITC: "ITC Ltd",
  SBIN: "State Bank of India",
  LT: "Larsen & Toubro",
  ADANIENT: "Adani Enterprises",
  HCLTECH: "HCL Technologies",
};

// Fallback sample if no API/data provided
const SAMPLE = [
  { Person: "Ajay", Stock: "TCS", "Buy Price": 3500, "Current Price": 3800, "Target Price": 4000 },
  { Person: "Ajay", Stock: "INFY", "Buy Price": 1400, "Current Price": 1500, "Target Price": 1600 },
  { Person: "Sneha", Stock: "WIPRO", "Buy Price": 420, "Current Price": 450, "Target Price": 500 },
  { Person: "Rahul", Stock: "HCLTECH", "Buy Price": 1150, "Current Price": 1300, "Target Price": 1450 },
  { Person: "Meena", Stock: "NESTLE", "Buy Price": 21000, "Current Price": 22500, "Target Price": 24000 },
  { Person: "Vikram", Stock: "BAJAJ-AUTO", "Buy Price": 4300, "Current Price": 4700, "Target Price": 5200 }
];

const fmtINR = (n) => {
  if (!isFinite(n) || n === null) return "—";
  if (n === 0) return "₹0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + "₹" + abs.toLocaleString("en-IN");
};
const percent = (num, den) => (!isFinite(num) || !isFinite(den) || den === 0) ? 0 : (num / den) * 100;
const getVal = (row, key) =>
  row[key] ?? row[key?.replace?.(/\s/g, "")] ?? row[key?.replace?.(" ", "")] ?? row[key?.replace?.(/\s+/g, "")] ?? null;
const getQty = (row) => row.Qty ?? row.qty ?? row.Quantity ?? row.quantity ?? 1;

function normalizeInput(data) {
  if (!Array.isArray(data)) return [];
  // passthrough if already grouped
  if (data.length && (data[0].stocks || (typeof Object.values(data[0])[0] === "object" && data[0].person))) {
    return data;
  }
  const byPerson = new Map();
  for (const row of data) {
    const person = row.Person ?? row.person;
    const stock = row.Stock ?? row.stock;
    const buy = getVal(row, "Buy Price") ?? row.buy;
    const current = getVal(row, "Current Price") ?? row.current;
    const target = getVal(row, "Target Price") ?? row.target;
    const qty = getQty(row);
    if (!person || !stock) continue;
    const profit = (isFinite(current) && isFinite(buy)) ? (current - buy) : 0;
    if (!byPerson.has(person)) byPerson.set(person, {});
    byPerson.get(person)[stock] = { profit, buy, current, target, qty };
  }
  return Array.from(byPerson.entries()).map(([person, stocks]) => ({ person, stocks }));
}

function normalizeStock(val) {
  if (typeof val === "number") return { profit: val, buy: null, current: null, target: null, qty: 1 };
  const { profit = 0, buy = null, current = null, target = null, qty = 1 } = val || {};
  return { profit, buy, current, target, qty };
}

function targetProgress(buy, current, target) {
  if (buy === null || current === null || target === null) return { pctLeft: null, reached: false };
  const denom = target - buy;
  if (denom === 0) return { pctLeft: 0, reached: true };
  const progress = (current - buy) / denom; // 0 at buy, 1 at target
  const pctLeft = Math.max(0, (1 - progress) * 100);
  return { pctLeft: Number.isFinite(pctLeft) ? pctLeft : null, reached: progress >= 1 };
}

function returnPct(buy, current) {
  if (buy === null || current === null || buy === 0) return null;
  return percent(current - buy, buy);
}

/**
 * PeopleStocksDashboard
 * Props:
 *  - apiUrl?: string (e.g. "http://127.0.0.1:4000/api/people-stocks") returning JSON array of rows
 *  - data?: array (same shape as SAMPLE)
 */
export default function PeopleStocksDashboard({ apiUrl, data }) {
  const [remote, setRemote] = useState(null);
  const [loading, setLoading] = useState(Boolean(apiUrl));
  const [error, setError] = useState(null);
  const [personIdx, setPersonIdx] = useState(0);

  // Fetch if apiUrl provided
  useEffect(() => {
    if (!apiUrl) return;
    setLoading(true);
    fetch(apiUrl)
      .then((r) => r.json())
      .then((j) => {
        // Accept either {records:[...]} or [...]
        const rows = Array.isArray(j) ? j : (j.records || j.data || j.summary || j);
        setRemote(Array.isArray(rows) ? rows : []);
        setError(null);
      })
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const base = data ?? remote ?? SAMPLE;
  const normalized = useMemo(() => normalizeInput(base), [base]);
  const person = normalized[personIdx] ?? { person: "—", stocks: {} };

  const { rows, total, bestRow, worstRow, winRate } = useMemo(() => {
    const s = person.stocks || {};
    const pairs = Object.entries(s);
    const rows = pairs.map(([k, v]) => {
      const z = normalizeStock(v);
      const rPct = returnPct(z.buy, z.current);
      const tProg = targetProgress(z.buy, z.current, z.target);
      return {
        key: k,
        label: STOCK_LABELS[k] || k,
        profit: z.profit,
        buy: z.buy,
        current: z.current,
        target: z.target,
        qty: z.qty ?? 1,
        returnPct: rPct,
        targetPctLeft: tProg.pctLeft,
        targetReached: tProg.reached,
        abs: Math.abs(z.profit),
      };
    });
    const total = rows.reduce((acc, r) => acc + (r.profit || 0), 0);
    const bestRow = rows.reduce((m, r) => (r.profit > (m?.profit ?? -Infinity) ? r : m), null);
    const worstRow = rows.reduce((m, r) => (r.profit < (m?.profit ?? Infinity) ? r : m), null);
    const positives = rows.filter((r) => (r.profit || 0) > 0).length;
    const winRate = percent(positives, rows.length);
    return { rows, total, bestRow, worstRow, winRate };
  }, [person]);

  // Absolute-only donut composition
  const donutData = useMemo(() => {
    const sumAbs = rows.reduce((a, r) => a + r.abs, 0);
    return rows.map((r) => ({
      name: r.label,
      value: sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100,
      raw: r.profit,
    }));
  }, [rows]);

  const barData = rows.map((r) => ({ label: r.label, value: r.profit }));

  const personOptions = normalized.map((p) => p.person);

  if (loading) return <div className="p-6">Loading people stocks…</div>;
  if (error)   return <div className="p-6 text-red-600">Error: {String(error)}</div>;
  if (!normalized.length) return <div className="p-6 text-gray-600">No data</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-semibold">People → Stock Profit Dashboard</h3>
        <select
          className="border rounded px-3 py-2"
          value={personIdx}
          onChange={(e) => setPersonIdx(Number(e.target.value))}
        >
          {personOptions.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI title="Person" value={person.person} />
        <KPI title="Total Profit" value={fmtINR(total)} valueClass={total > 0 ? "text-green-600" : total < 0 ? "text-red-600" : "text-gray-600"} />
        <KPI title="Best Stock" value={bestRow ? `${bestRow.label} • ${fmtINR(bestRow.profit)}` : "—"} />
        <KPI title="Worst Stock" value={worstRow ? `${worstRow.label} • ${fmtINR(worstRow.profit)}` : "—"} />
        <KPI title="Win Rate" value={`${winRate.toFixed(0)}%`} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut */}
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-medium mb-2">
            Stock Contribution (%) <span className="ml-2 text-xs text-gray-500">absolute %</span>
          </div>
          <PieChart width={420} height={280}>
            <Pie
              data={donutData}
              cx={200}
              cy={130}
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              label={(e) => `${e.name}: ${e.value.toFixed(0)}%`}
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <RTooltip formatter={(v, n, p) => [`${Number(v).toFixed(1)}% (${fmtINR(p.payload.raw)})`, n]} />
          </PieChart>
        </div>

        {/* Bar */}
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-medium mb-2">Profit / Loss by Stock (₹)</div>
          <BarChart width={460} height={280} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <RTooltip formatter={(v) => fmtINR(v)} />
            <Legend />
            <Bar dataKey="value" name="Profit (₹)">
              {barData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.value > 0 ? POS : entry.value < 0 ? NEG : NEU} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium mb-3">Detail</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Buy</th>
                <th className="py-2 pr-4">Current</th>
                <th className="py-2 pr-4">Target</th>
                <th className="py-2 pr-4">Profit (₹)</th>
                <th className="py-2 pr-4">Return %</th>
                <th className="py-2">Target Progress</th>
                <th className="py-2">Contribution %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sumAbs = rows.reduce((a, x) => a + x.abs, 0);
                const pct = sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100; // absolute only
                const rp = r.returnPct;
                const tp = r.targetPctLeft;
                const reached = r.targetReached;
                return (
                  <tr key={r.key} className="border-t align-middle">
                    <td className="py-2 pr-4 whitespace-nowrap">{r.label}</td>
                    <td className="py-2 pr-4">{r.buy !== null ? fmtINR(r.buy) : "—"}</td>
                    <td className="py-2 pr-4">{r.current !== null ? fmtINR(r.current) : "—"}</td>
                    <td className="py-2 pr-4">{r.target !== null ? fmtINR(r.target) : "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={r.profit > 0 ? "text-green-600" : r.profit < 0 ? "text-red-600" : "text-gray-600"}>
                        {fmtINR(r.profit)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{rp === null ? "—" : `${rp.toFixed(1)}%`}</td>
                    <td className="py-2">
                      {tp === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="w-64">
                          <div className="w-full bg-gray-100 rounded h-2">
                            <div
                              className={`h-2 rounded ${reached ? "bg-green-600" : "bg-indigo-500"}`}
                              style={{ width: `${Math.max(0, Math.min(100, 100 - tp))}%` }}
                              title={reached ? "Target reached" : `${(100 - tp).toFixed(1)}% progress`}
                            />
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {reached ? (
                              <span className="text-green-600">Reached</span>
                            ) : (
                              <>{tp.toFixed(1)}% left</>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="w-64 bg-gray-100 rounded h-2">
                        <div
                          className="h-2 rounded bg-blue-500"
                          style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                          title={`${pct.toFixed(1)}%`}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{pct.toFixed(1)}%</div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t font-medium">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">{fmtINR(total)}</td>
                <td className="py-2 text-gray-500">—</td>
                <td className="py-2 text-gray-500">—</td>
                <td className="py-2 text-gray-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="text-xs text-gray-500">
        • <b>Return %</b> = (Current − Buy) / Buy × 100.<br/>
        • <b>Target Progress</b> shows remaining distance from Buy → Target. “X% left” = how much remains; once Current ≥ Target, it shows “Reached”.<br/>
        • <b>Contribution %</b> = |stock profit| / sum(|profits|) × 100 (absolute only).
      </div>
    </div>
  );
}

function KPI({ title, value, valueClass = "" }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className={`text-lg font-semibold mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}
