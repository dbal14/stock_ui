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
  ANGELONE: "Angel One",
  ASIANPAINT: "Asian Paints",
};

const fmtINR = (n) => {
  if (!isFinite(n) || n === null) return "—";
  if (Number(n) === 0) return "₹0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + "₹" + abs.toLocaleString("en-IN");
};
const percent = (num, den) => (!isFinite(num) || !isFinite(den) || den === 0) ? 0 : (num / den) * 100;

// Robust getter tolerant to spaces/slashes/case
const getVal = (row, key) => {
  if (!row || !key) return null;
  const variants = [
    key,
    key.replace(/\s+/g, ""),
    key.replace(/\s/g, ""),
    key.replace(/[^\w]/g, ""),
    key.toLowerCase(),
    key.toLowerCase().replace(/[^\w]/g, "")
  ];
  for (const v of variants) {
    if (v in row) return row[v];
    const hit = Object.keys(row).find(
      (rk) => rk.toLowerCase().replace(/[^\w]/g, "") === v.toLowerCase()
    );
    if (hit) return row[hit];
  }
  return null;
};
const getQty = (row) => row.Qty ?? row.qty ?? row.Quantity ?? row.quantity ?? 1;

/** Normalize flat API rows -> [{ person, stocks: {SYMBOL:{buy,current,target,qty,invested,profit,dayReturn}} }] */
function normalizeInput(data, useQtyTotal = true) {
  if (!Array.isArray(data)) return [];
  if (data.length && (data[0].stocks || (typeof Object.values(data[0])[0] === "object" && data[0].person))) {
    return data; // already grouped
  }

  const byPerson = new Map();
  for (const raw of data) {
    const person = raw.Person ?? raw.person;
    const stockRaw = raw.Stock ?? raw.stock;
    const stock = typeof stockRaw === "string" ? stockRaw.trim() : stockRaw;
    if (!person || !stock) continue;

    const buy      = Number(getVal(raw, "Buy Price") ?? raw.buy ?? null);
    const current  = Number(getVal(raw, "Current Price") ?? raw.current ?? null);
    const target   = Number(getVal(raw, "Target Price") ?? raw.target ?? null);
    const invested = Number(getVal(raw, "Invested") ?? raw.invested ?? null);
    const qty      = Number(getQty(raw));
    const day1     = Number(getVal(raw, "Return over 1day") ?? getVal(raw, "Return over 1 day") ?? raw.dayReturn ?? null);
    const plField  = Number(getVal(raw, "profit/loss") ?? getVal(raw, "Profit/Loss"));

    let profit;
    if (isFinite(plField)) {
      profit = plField;
    } else {
      const perShare = (isFinite(current) && isFinite(buy)) ? (current - buy) : 0;
      profit = useQtyTotal ? perShare * (Number.isFinite(qty) ? qty : 1) : perShare;
    }

    if (!byPerson.has(person)) byPerson.set(person, {});
    byPerson.get(person)[stock] = { profit, buy, current, target, qty, invested, dayReturn: isFinite(day1) ? day1 : null };
  }

  return Array.from(byPerson.entries()).map(([person, stocks]) => ({ person, stocks }));
}

function normalizeStock(val) {
  if (typeof val === "number")
    return { profit: val, buy: null, current: null, target: null, qty: 1, invested: null, dayReturn: null };
  const { profit = 0, buy = null, current = null, target = null, qty = 1, invested = null, dayReturn = null } = val || {};
  return { profit, buy, current, target, qty, invested, dayReturn };
}

function targetProgress(buy, current, target) {
  if (buy === null || current === null || target === null) return { pctLeft: null, reached: false };
  const denom = target - buy;
  if (denom === 0) return { pctLeft: 0, reached: true };
  const progress = (current - buy) / denom;
  const pctLeft = Math.max(0, (1 - progress) * 100);
  return { pctLeft: Number.isFinite(pctLeft) ? pctLeft : null, reached: progress >= 1 };
}

function totalReturnPct(buy, current) {
  if (buy === null || current === null || buy === 0) return null;
  return percent(current - buy, buy);
}

/* ---------------- Sorting hook ---------------- */
function useSorter(rows) {
  const [sortKey, setSortKey] = useState(null);           // "invested" | "profit" | "totalReturnPct"
  const [sortDir, setSortDir] = useState("desc");         // "asc" | "desc"

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const factor = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = Number.isFinite(a[sortKey]) ? a[sortKey] : -Infinity;
      const bv = Number.isFinite(b[sortKey]) ? b[sortKey] : -Infinity;
      if (av === bv) return 0;
      return av > bv ? factor : -factor;
    });
  }, [rows, sortKey, sortDir]);

  const sortIcon = (key) => (sortKey !== key ? "↕" : sortDir === "desc" ? "↓" : "↑");

  return { sorted, toggleSort, sortIcon, sortKey, sortDir };
}

/* ---------------- Component ---------------- */
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
        const rows = Array.isArray(j) ? j : (j.client || j.records || j.data || j.summary || j);
        setRemote(Array.isArray(rows) ? rows : []);
        setError(null);
      })
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const base = data ?? remote ?? [];
  const normalized = useMemo(() => normalizeInput(base, true), [base]); // quantity-adjusted total P/L
  const person = normalized[personIdx] ?? { person: "—", stocks: {} };

  const { rows, total, bestRow, worstRow, winRate, investedSum } = useMemo(() => {
    const s = person.stocks || {};
    const pairs = Object.entries(s);
    const rows = pairs.map(([k, v]) => {
      const z = normalizeStock(v);
      const rPct = totalReturnPct(z.buy, z.current);
      const tProg = targetProgress(z.buy, z.current, z.target);
      // fallback invested if null: buy * qty
      const investedVal = Number.isFinite(z.invested)
        ? z.invested
        : (Number.isFinite(z.buy) && Number.isFinite(z.qty) ? z.buy * z.qty : null);

      return {
        key: k,
        label: STOCK_LABELS[k] || k,
        profit: z.profit,
        buy: z.buy,
        current: z.current,
        target: z.target,
        qty: z.qty ?? 1,
        invested: investedVal,
        dayReturn: z.dayReturn,          // "Return over 1day"
        totalReturnPct: rPct,
        targetPctLeft: tProg.pctLeft,
        targetReached: tProg.reached,
        abs: Math.abs(z.profit),
      };
    });
    const total = rows.reduce((acc, r) => acc + (r.profit || 0), 0);
    const investedSum = rows.reduce((acc, r) => acc + (Number.isFinite(r.invested) ? r.invested : 0), 0);
    const bestRow = rows.reduce((m, r) => (r.profit > (m?.profit ?? -Infinity) ? r : m), null);
    const worstRow = rows.reduce((m, r) => (r.profit < (m?.profit ?? Infinity) ? r : m), null);
    const positives = rows.filter((r) => (r.profit || 0) > 0).length;
    const winRate = percent(positives, rows.length);
    return { rows, total, bestRow, worstRow, winRate, investedSum };
  }, [person]);

  // Sorting setup for the detail table
  const { sorted, toggleSort, sortIcon } = useSorter(rows);
  const sumAbs = useMemo(() => rows.reduce((a, x) => a + x.abs, 0), [rows]);

  // Charts (use unsorted rows)
  const donutData = useMemo(() => {
    return rows.map((r) => ({
      name: r.label,
      value: sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100,
      raw: r.profit,
    }));
  }, [rows, sumAbs]);

  const barData = rows.map((r) => ({ label: r.label, value: r.profit }));
  const personOptions = normalized.map((p) => p.person);

  if (loading) return <div className="p-6">Loading people stocks…</div>;
  if (error)   return <div className="p-6 text-red-600">Error: {String(error)}</div>;
  if (!normalized.length) return <div className="p-6 text-gray-600">No data</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-semibold">People → Invested in Stock Profit Dashboard</h3>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KPI title="Person" value={person.person} />
        <KPI title="Invested (₹)" value={fmtINR(investedSum)} />
        <KPI title="Total Profit/Loss" value={fmtINR(total)} valueClass={total > 0 ? "text-green-600" : total < 0 ? "text-red-600" : "text-gray-600"} />
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
            <Bar dataKey="value" name="Profit/Loss (₹)">
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
                <th className="py-2 pr-4">Quantity</th>

                {/* Invested sortable */}
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => toggleSort("invested")}
                    title="Sort by Invested"
                  >
                    Invested <span className="text-xs">{sortIcon("invested")}</span>
                  </button>
                </th>

                {/* Profit/Loss sortable */}
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => toggleSort("profit")}
                    title="Sort by Profit/Loss"
                  >
                    Profit/Loss (₹) <span className="text-xs">{sortIcon("profit")}</span>
                  </button>
                </th>

                <th className="py-2 pr-4">Day Return %</th>

                {/* Total Return % sortable + colored values */}
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => toggleSort("totalReturnPct")}
                    title="Sort by Total Return %"
                  >
                    Total Return % <span className="text-xs">{sortIcon("totalReturnPct")}</span>
                  </button>
                </th>

                <th className="py-2">Target Progress</th>
                <th className="py-2">Contribution %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const pct = sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100; // absolute-only contribution
                const tp = r.targetPctLeft;
                const reached = r.targetReached;
                return (
                  <tr key={r.key} className="border-t align-middle">
                    <td className="py-2 pr-4 whitespace-nowrap">{r.label}</td>
                    <td className="py-2 pr-4">{r.buy !== null ? fmtINR(r.buy) : "—"}</td>
                    <td className="py-2 pr-4">{r.current !== null ? fmtINR(r.current) : "—"}</td>
                    <td className="py-2 pr-4">{r.target !== null ? fmtINR(r.target) : "—"}</td>
                    <td className="py-2 pr-4">{isFinite(r.qty) ? r.qty : "—"}</td>
                    <td className="py-2 pr-4">{r.invested !== null ? fmtINR(r.invested) : "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={r.profit > 0 ? "text-green-600" : r.profit < 0 ? "text-red-600" : "text-gray-600"}>
                        {fmtINR(r.profit)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {r.dayReturn === null || Number.isNaN(r.dayReturn)
                        ? "—"
                        : <span className={r.dayReturn > 0 ? "text-green-600" : r.dayReturn < 0 ? "text-red-600" : "text-gray-600"}>
                            {r.dayReturn.toFixed(2)}%
                          </span>}
                    </td>
                    <td className="py-2 pr-4">
                      {r.totalReturnPct === null
                        ? "—"
                        : <span className={
                            r.totalReturnPct > 0 ? "text-green-600" :
                            r.totalReturnPct < 0 ? "text-red-600"  :
                            "text-gray-600"
                          }>
                            {r.totalReturnPct.toFixed(2)}%
                          </span>}
                    </td>
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
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">{fmtINR(investedSum)}</td>
                <td className="py-2 pr-4">{fmtINR(total)}</td>
                <td className="py-2 text-gray-500">—</td>
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
        • <b>Day Return %</b> comes from your “Return over 1day” column.<br/>
        • <b>Total Return %</b> = (Current − Buy) / Buy × 100. Colored green (+), red (−), gray (0/NA).<br/>
        • <b>Target Progress</b> shows remaining distance from Buy → Target.<br/>
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
