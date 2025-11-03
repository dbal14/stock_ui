// src/components/PeopleStocksDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981"];
const POS = "#16a34a", NEG = "#dc2626", NEU = "#6b7280";

const fmtINR = (n) => {
  if (!isFinite(n) || n === null) return "—";
  if (Number(n) === 0) return "₹0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + "₹" + abs.toLocaleString("en-IN");
};
const percent = (num, den) =>
  (!isFinite(num) || !isFinite(den) || den === 0) ? null : (num / den) * 100;

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
const getQty = (row) =>
  row.Qty ?? row.qty ?? row.Quantity ?? row.quantity ?? 1;

/** Normalize flat API rows -> [{ person, stocks: {SYMBOL:{buy,current,target,qty,invested,profit,dayReturn}} }] */
function normalizeInput(data, useQtyTotal = true) {
  if (!Array.isArray(data)) return [];
  if (
    data.length &&
    (data[0].stocks ||
      (typeof Object.values(data[0])[0] === "object" && data[0].person))
  ) {
    return data; // already grouped
  }

  const byPerson = new Map();
  for (const raw of data) {
    const person = raw.Person ?? raw.person;
    const stockRaw = raw.Stock ?? raw.stock;
    const stock = typeof stockRaw === "string" ? stockRaw.trim() : stockRaw;
    if (!person || !stock) continue;

    const buy = Number(getVal(raw, "Buy Price") ?? raw.buy ?? null);
    const current = Number(getVal(raw, "Current Price") ?? raw.current ?? null);
    const target = Number(getVal(raw, "Target Price") ?? raw.target ?? null);
    const invested = Number(getVal(raw, "Invested") ?? raw.invested ?? null);
    const qty = Number(getQty(raw));
    const day1 = Number(
      getVal(raw, "Return over 1day") ??
        getVal(raw, "Return over 1 day") ??
        raw.dayReturn ??
        null
    );
    const plField = Number(
      getVal(raw, "profit/loss") ?? getVal(raw, "Profit/Loss")
    );

    let profit;
    if (isFinite(plField)) {
      profit = plField;
    } else {
      const perShare =
        isFinite(current) && isFinite(buy) ? current - buy : 0;
      profit = useQtyTotal ? perShare * (Number.isFinite(qty) ? qty : 1) : perShare;
    }

    if (!byPerson.has(person)) byPerson.set(person, {});
    byPerson.get(person)[stock] = {
      profit,
      buy,
      current,
      target,
      qty,
      invested,
      dayReturn: isFinite(day1) ? day1 : null,
    };
  }

  return Array.from(byPerson.entries()).map(([person, stocks]) => ({
    person,
    stocks,
  }));
}

function normalizeStock(val) {
  if (typeof val === "number")
    return {
      profit: val,
      buy: null,
      current: null,
      target: null,
      qty: 1,
      invested: null,
      dayReturn: null,
    };
  const {
    profit = 0,
    buy = null,
    current = null,
    target = null,
    qty = 1,
    invested = null,
    dayReturn = null,
  } = val || {};
  return { profit, buy, current, target, qty, invested, dayReturn };
}

function targetProgress(buy, current, target) {
  if (buy === null || current === null || target === null)
    return { pctLeft: null, reached: false };
  const denom = target - buy;
  if (denom === 0) return { pctLeft: 0, reached: true };
  const progress = (current - buy) / denom; // 0 at buy, 1 at target
  const pctLeft = Math.max(0, (1 - progress) * 100);
  return { pctLeft: Number.isFinite(pctLeft) ? pctLeft : null, reached: progress >= 1 };
}

function totalReturnPct(buy, current) {
  if (buy === null || current === null || buy === 0) return null;
  return ((current - buy) / buy) * 100;
}

/* ---------------- Sorting hook ---------------- */
function useSorter(rows) {
  const [sortKey, setSortKey] = useState(null); // "invested" | "profit" | "totalReturnPct"
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
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

  return { sorted, sortKey, sortDir, setSort };
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

  const {
    rows, total, bestRow, worstRow, winRate,
    investedSum
  } = useMemo(() => {
    const s = person.stocks || {};
    const pairs = Object.entries(s);
    const rows = pairs.map(([k, v]) => {
      const z = normalizeStock(v);
      const rPct = totalReturnPct(z.buy, z.current);
      const tProg = targetProgress(z.buy, z.current, z.target);
      const investedVal = Number.isFinite(z.invested)
        ? z.invested
        : (Number.isFinite(z.buy) && Number.isFinite(z.qty) ? z.buy * z.qty : null);

      return {
        key: k,
        label: k, // show symbol as-is
        profit: z.profit,
        buy: z.buy,
        current: z.current,
        target: z.target,
        qty: z.qty ?? 1,
        invested: investedVal,
        dayReturn: z.dayReturn, // from "Return over 1day"
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
    const winRate = ((positives / (rows.length || 1)) * 100);

    return { rows, total, bestRow, worstRow, winRate, investedSum };
  }, [person]);

  // Sorting
  const { sorted, sortKey, sortDir, setSort } = useSorter(rows);
  const sumAbs = useMemo(() => rows.reduce((a, x) => a + x.abs, 0), [rows]);

  // Charts (compact sizes, no labels/legend)
  const donutData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.label,
        value: sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100,
        raw: r.profit,
      })),
    [rows, sumAbs]
  );
  const barData = rows.map((r) => ({ label: r.label, value: r.profit }));
  const personOptions = normalized.map((p) => p.person);

  const totalPLPct = percent(total, investedSum);
  const sortLabelMap = {
    invested: "Invested (₹)",
    profit: "Profit/Loss (₹)",
    totalReturnPct: "Total Return %",
  };
  const sortArrow = sortDir === "desc" ? "↓" : "↑";
  const sortStatus = sortKey ? `Sorted by: ${sortLabelMap[sortKey] || sortKey} ${sortArrow}` : "";

  // Tiny buttons
  const sortBtnBase = "px-2 py-0.5 rounded border text-[11px]";
  const sortBtnActive = "bg-blue-600 text-white border-blue-600";
  const sortBtnIdle = "bg-white text-blue-700 border-blue-600 hover:bg-blue-50";

  if (loading) return <div className="p-4 text-xs">Loading people stocks…</div>;
  if (error) return <div className="p-4 text-xs text-red-600">Error: {String(error)}</div>;
  if (!normalized.length) return <div className="p-4 text-xs text-gray-600">No data</div>;

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">People → Invested in Stock Profit Dashboard</h3>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={personIdx}
          onChange={(e) => setPersonIdx(Number(e.target.value))}
        >
          {personOptions.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards (compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <KPI title="Person" value={person.person} />
        <KPI title="Invested (₹)" value={fmtINR(investedSum)} />
        <KPI
          title="Total Profit/Loss"
          value={
            totalPLPct === null
              ? `${fmtINR(total)}`
              : `${fmtINR(total)} (${totalPLPct >= 0 ? "+" : ""}${totalPLPct.toFixed(2)}%)`
          }
          valueClass={
            total > 0
              ? "text-green-600 font-semibold"
              : total < 0
              ? "text-red-600 font-semibold"
              : "text-gray-600"
          }
        />
        <KPI
          title="Best Stock"
          value={
            bestRow ? (
              <span className="font-semibold">
                {bestRow.label} • <span className="text-green-600">{fmtINR(bestRow.profit)}</span>
              </span>
            ) : (
              "—"
            )
          }
        />
        <KPI
          title="Worst Stock"
          value={
            worstRow ? (
              <span className="font-semibold">
                {worstRow.label} • <span className="text-red-600">{fmtINR(worstRow.profit)}</span>
              </span>
            ) : (
              "—"
            )
          }
        />
        <KPI title="Win Rate" value={`${(winRate || 0).toFixed(0)}%`} />
      </div>

      {/* Charts (compact) */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Donut */}
        <div className="rounded-xl border p-2">
          <div className="text-[12px] font-medium mb-1">
            Stock Contribution (%) <span className="ml-1 text-[10px] text-gray-500">absolute %</span>
          </div>
          <PieChart width={300} height={190}>
            <Pie
              data={donutData}
              cx={150}
              cy={95}
              innerRadius={45}
              outerRadius={70}
              dataKey="value"
              nameKey="name"
              label={false}
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <RTooltip formatter={(v, n, p) => [`${Number(v).toFixed(1)}% (${fmtINR(p.payload.raw)})`, n]} />
          </PieChart>
        </div>

        {/* Bar */}
        <div className="rounded-xl border p-2">
          <div className="text-[12px] font-medium mb-1">Profit / Loss by Stock (₹)</div>
          <BarChart width={360} height={210} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <RTooltip formatter={(v) => fmtINR(v)} />
            <Bar dataKey="value" name="Profit/Loss (₹)">
              {barData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.value > 0 ? POS : entry.value < 0 ? NEG : NEU} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* Detail table (compact) */}
      <div className="rounded-xl border p-2">
        <div className="text-[12px] font-medium mb-1">Detail</div>

        {/* Sort-by control (tiny) */}
        <div className="flex flex-wrap items-center gap-1 mb-1">
          <span className="text-[11px] text-gray-700 font-medium">Sort by:</span>
          <button
            type="button"
            onClick={() => setSort("invested")}
            className={`${sortBtnBase} ${sortKey === "invested" ? sortBtnActive : sortBtnIdle}`}
            title="Sort by Invested"
          >
            Invested {sortKey === "invested" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
          <button
            type="button"
            onClick={() => setSort("profit")}
            className={`${sortBtnBase} ${sortKey === "profit" ? sortBtnActive : sortBtnIdle}`}
            title="Sort by Profit/Loss (₹)"
          >
            Profit/Loss (₹) {sortKey === "profit" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
          <button
            type="button"
            onClick={() => setSort("totalReturnPct")}
            className={`${sortBtnBase} ${sortKey === "totalReturnPct" ? sortBtnActive : sortBtnIdle}`}
            title="Sort by Total Return %"
          >
            Total Return % {sortKey === "totalReturnPct" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
        </div>

        {/* Sort status */}
        {sortKey && (
          <div className="text-[11px] text-gray-600 mb-1">
            Sorted by: {sortLabelMap[sortKey] || sortKey} {sortArrow}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead className="text-left">
              <tr className="text-blue-700 font-bold">
                <th className="py-1 pr-2">Stock</th>
                <th className="py-1 pr-2">Buy</th>
                <th className="py-1 pr-2">Current</th>
                <th className="py-1 pr-2">Target</th>
                <th className="py-1 pr-2">Quantity</th>
                <th className="py-1 pr-2">Invested</th>
                <th className="py-1 pr-2">Profit/Loss (₹)</th>
                <th className="py-1 pr-2">Day Return %</th>
                <th className="py-1 pr-2">Total Return %</th>
                <th className="py-1">Target Progress</th>
                <th className="py-1">Contribution %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const pct = sumAbs === 0 ? 0 : (r.abs / sumAbs) * 100; // absolute-only contribution
                const tp = r.targetPctLeft;
                const reached = r.targetReached;
                return (
                  <tr key={r.key} className="border-t align-middle">
                    <td className="py-1 pr-2 whitespace-nowrap">{r.label}</td>
                    <td className="py-1 pr-2">{r.buy !== null ? fmtINR(r.buy) : "—"}</td>
                    <td className="py-1 pr-2">{r.current !== null ? fmtINR(r.current) : "—"}</td>
                    <td className="py-1 pr-2">{r.target !== null ? fmtINR(r.target) : "—"}</td>
                    <td className="py-1 pr-2">{isFinite(r.qty) ? r.qty : "—"}</td>
                    <td className="py-1 pr-2">{r.invested !== null ? fmtINR(r.invested) : "—"}</td>
                    <td className="py-1 pr-2">
                      <span
                        className={
                          r.profit > 0
                            ? "text-green-600 font-semibold"
                            : r.profit < 0
                            ? "text-red-600 font-semibold"
                            : "text-gray-600"
                        }
                      >
                        {fmtINR(r.profit)}
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      {r.dayReturn === null || Number.isNaN(r.dayReturn)
                        ? "—"
                        : (
                          <span
                            className={
                              r.dayReturn > 0
                                ? "text-green-600 font-semibold"
                                : r.dayReturn < 0
                                ? "text-red-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {r.dayReturn.toFixed(2)}%
                          </span>
                        )}
                    </td>
                    <td className="py-1 pr-2">
                      {r.totalReturnPct === null
                        ? "—"
                        : (
                          <span
                            className={
                              r.totalReturnPct > 0
                                ? "text-green-600 font-semibold"
                                : r.totalReturnPct < 0
                                ? "text-red-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {r.totalReturnPct.toFixed(2)}%
                          </span>
                        )}
                    </td>
                    <td className="py-1">
                      {tp === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="w-20"> {/* 80px */}
                          <div className="w-full bg-gray-100 rounded h-1.5">
                            <div
                              className={`h-1.5 rounded ${reached ? "bg-green-600" : "bg-indigo-500"}`}
                              style={{ width: `${Math.max(0, Math.min(100, 100 - tp))}%` }}
                              title={reached ? "Target reached" : `${(100 - tp).toFixed(1)}% progress`}
                            />
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {reached ? (
                              <span className="text-green-600">Reached</span>
                            ) : (
                              <>{tp.toFixed(1)}% left</>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-1">
                      <div className="w-20 bg-gray-100 rounded h-1.5">
                        <div
                          className="h-1.5 rounded bg-blue-500"
                          style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                          title={`${pct.toFixed(1)}%`}
                        />
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{pct.toFixed(1)}%</div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t font-medium">
                <td className="py-1 pr-2">Total</td>
                <td className="py-1 pr-2">—</td>
                <td className="py-1 pr-2">—</td>
                <td className="py-1 pr-2">—</td>
                <td className="py-1 pr-2">—</td>
                <td className="py-1 pr-2">{fmtINR(investedSum)}</td>
                <td className="py-1 pr-2">{fmtINR(total)}</td>
                <td className="py-1 text-gray-500">—</td>
                <td className="py-1 text-gray-500">—</td>
                <td className="py-1 text-gray-500">—</td>
                <td className="py-1 text-gray-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes (compact) */}
      <div className="text-[10px] text-gray-500">
        • <b>Total Profit/Loss %</b> in KPI = Total P/L ÷ Total Invested × 100.{" "}
        • <b>Day Return %</b> from “Return over 1day”.{" "}
        • <b>Total Return %</b> = (Current − Buy) / Buy × 100 (green +, red −, gray 0/NA).{" "}
        • <b>Contribution %</b> = |stock profit| / sum(|profits|) × 100.
      </div>
    </div>
  );
}

/* Tiny button component for Sort-by row */
function SortBtn({ label, active, dir, onClick }) {
  const base = "px-2 py-0.5 rounded border text-[11px]";
  const activeCls = "bg-blue-600 text-white border-blue-600";
  const idleCls = "bg-white text-blue-700 border-blue-600 hover:bg-blue-50";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeCls : idleCls}`}>
      {label} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </button>
  );
}

function KPI({ title, value, valueClass = "" }) {
  return (
    <div className="rounded-xl border p-2">
      <div className="text-[10px] text-gray-500">{title}</div>
      <div className={`text-base font-semibold mt-0.5 ${valueClass}`}>{value}</div>
    </div>
  );
}
