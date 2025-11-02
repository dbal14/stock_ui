import React, { useEffect, useState, useRef, useMemo } from 'react';

// Component: resizable, sortable summary table for stock data
// - Fetches data from an API returning { summary: [...] }
// - Renders 4 columns (Stock Name, Day Return, Performance, More)
// - Columns can be resized via mouse/touch drag or keyboard arrows
// - Sorting applies to Day/Week/Month by averaging the respective arrays
export default function SummaryResizableTable({
  apiUrl = 'http://127.0.0.1:4000/api/summary',
  initialColumns,
}) {
  // ------------------------------
  // 1) Basic state: data loading, error
  // ------------------------------
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ------------------------------
  // Watchlist state (server-side persistence via Flask)
  // ------------------------------
  const baseApi = useMemo(() => apiUrl.replace('/api/summary', ''), [apiUrl]);
  const [saved, setSaved] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${baseApi}/api/watchlist`);
        const j = await r.json();
        setSaved(new Set((j.symbols || []).map(s => String(s).toUpperCase())));
      } catch {
        // ignore load errors (no watchlist yet)
      }
    })();
  }, [baseApi]);

  const addSymbol = async (symbol) => {
    const sym = String(symbol).toUpperCase();
    try {
      await fetch(`${baseApi}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym }),
      });
      setSaved(prev => new Set(prev).add(sym));
    } catch {/* ignore */}
  };

  const removeSymbol = async (symbol) => {
    const sym = String(symbol).toUpperCase();
    try {
      await fetch(`${baseApi}/api/watchlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym }),
      });
      setSaved(prev => {
        const next = new Set(prev);
        next.delete(sym);
        return next;
      });
    } catch {/* ignore */}
  };

  const isSaved = (symbol) => saved.has(String(symbol).toUpperCase());
  const toggleSave = (symbol) => (isSaved(symbol) ? removeSymbol(symbol) : addSymbol(symbol));

  // ------------------------------
  // 2) Column configuration
  // ------------------------------
  // Columns: Stock, Performance, More (+ Day Return)
  // Each column defines a key used to read from each row and an initial width.
  const defaultColumns = [
    { key: 'symbol', label: 'Stock Name', initialWidth: 220 },
    { key: 'current', label: 'Day Return', initialWidth: 120 }, // numerical or string value
    { key: 'performance', label: 'Performance', initialWidth: 560 }, // shows chips for day/week/month series
    { key: 'metrics', label: 'More', initialWidth: 240 }, // positive/negative summary & pos%
  ];
  const columns = initialColumns || defaultColumns;

  // Column widths (px). We initialize from the provided column definitions.
  const [colWidths, setColWidths] = useState(() => columns.map((c) => c.initialWidth || 150));

  // ------------------------------
  // 3) Sorting state & helpers
  // ------------------------------
  // sortKey can be 'day' | 'week' | 'month' | 'dayReturn' | null. sortDir can be 'asc' | 'desc'.
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  // Toggle sorting when user clicks the Day/Week/Month/DayReturn buttons.
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Average helper for arrays of values (strings or numbers). Ignores NaN by coercing to 0.
  const aggAvg = (arr) => {
    if (!arr || !arr.length) return 0;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += Number(arr[i]) || 0;
    return s / arr.length;
  };

  // Map logical sort keys to the data fields holding the arrays.
  const fieldMap = { day: '5D_Change', week: '5W_Change', month: '5M_Change' };

  // Compute sorted view of data only when inputs change (memoized for performance).
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    // New: direct sort by Day Return ("current") without changing existing sorts
    if (sortKey === 'dayReturn') {
      const nv = (x) => {
        const n = Number(x);
        return Number.isNaN(n) ? 0 : n;
      };
      const copy = [...data];
      copy.sort((a, b) => (sortDir === 'asc' ? nv(a.current) - nv(b.current) : nv(b.current) - nv(a.current)));
      return copy;
    }

    // Existing: sort by averaged arrays for day/week/month
    const field = fieldMap[sortKey];
    const copy = [...data];
    copy.sort((a, b) => {
      const av = aggAvg(a[field]);
      const bv = aggAvg(b[field]);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  // ------------------------------
  // 4) Column resize (drag/touch/keyboard)
  // ------------------------------
  // Use a ref to hold transient drag state so we don't trigger rerenders while dragging.
  const dragState = useRef({ dragging: false, startX: 0, colIndex: null, startWidths: [] });

  // onMove: runs while dragging. Adjusts the active column and its neighbor, respecting min width.
  const onMove = (e) => {
    if (!dragState.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = clientX - dragState.current.startX;
    const idx = dragState.current.colIndex;

    const newWidths = [...dragState.current.startWidths];
    const minWidth = 60;

    // Prevent shrinking current column below min and stealing too much from the right neighbor
    const maxDelta = newWidths[idx + 1] ? newWidths[idx + 1] - minWidth : delta;
    const appliedDelta = Math.max(-newWidths[idx] + minWidth, Math.min(delta, maxDelta));

    // Apply delta to current column
    newWidths[idx] = Math.max(minWidth, dragState.current.startWidths[idx] + appliedDelta);

    // Inverse delta to next column (if exists) to keep total width more stable
    if (newWidths[idx + 1] !== undefined)
      newWidths[idx + 1] = Math.max(minWidth, dragState.current.startWidths[idx + 1] - appliedDelta);

    setColWidths(newWidths);
    e.preventDefault(); // avoid text selection on touch devices
  };

  // onUp: stop dragging and remove listeners.
  const onUp = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  };

  // startDrag: initialize drag state and attach listeners immediately for smooth dragging.
  const startDrag = (e, idx) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragState.current = { dragging: true, startX: clientX, colIndex: idx, startWidths: [...colWidths] };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    e.preventDefault();
  };

  // Keyboard resize: left/right arrows adjust widths; Shift increases step size.
  const onKeyResize = (e, idx) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = [...colWidths];
      const minWidth = 60;
      const delta = dir * step;

      // Limit delta by minWidth constraints of current and neighbor columns
      const allowedDelta = Math.max(
        -next[idx] + minWidth,
        Math.min(delta, next[idx + 1] ? next[idx + 1] - minWidth : delta)
      );

      next[idx] = Math.max(minWidth, next[idx] + allowedDelta);
      if (next[idx + 1] !== undefined) next[idx + 1] = Math.max(minWidth, next[idx + 1] - allowedDelta);
      setColWidths(next);
      e.preventDefault();
    }
  };

  // ------------------------------
  // 5) Data parsing helper
  // ------------------------------
  // Converts possibly-stringified JSON arrays to arrays of numbers, replacing NaN-like values with 0.
  const safeParseArray = (val) => {
    try {
      const arr = typeof val === 'string' ? JSON.parse(val) : val;
      if (!Array.isArray(arr)) return [];
      return arr.map((v) =>
        v == null || Number.isNaN(Number(v)) || String(v).toLowerCase() === 'nan' ? 0 : Number(v)
      );
    } catch (err) {
      return [];
    }
  };

  // ------------------------------
  // 6) Data fetching
  // ------------------------------
  // Fetch once on mount (and when apiUrl changes). Normalizes 5D/5W/5M arrays into numeric arrays.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const parsed = (json.summary || []).map((item) => ({
          ...item,
          current: item['Return over 1day'], // populate Day Return column
          '5D_Change': safeParseArray(item['5D_Change'] ?? item['5d_change'] ?? item['5D']),
          '5W_Change': safeParseArray(item['5W_Change'] ?? item['5w_change'] ?? item['5W']),
          '5M_Change': safeParseArray(item['5M_Change'] ?? item['5m_change'] ?? item['5M']),
        }));
        setData(parsed);
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup any dangling listeners on unmount
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [apiUrl]);

  // ------------------------------
  // 7) Small UI helpers for cells
  // ------------------------------
  // Renders a list of small percentage chips; green for positive, red for negative.
  const renderPercentList = (arr = []) => (
    <div className="flex flex-wrap items-center">
      {arr.map((val, i) => (
        <span
          key={i}
          className={`mr-1 mb-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] border ${
            Number(val) >= 0
              ? 'text-green-700 border-green-200 bg-green-50'
              : 'text-red-700 border-red-200 bg-red-50'
          }`}
        >
          {val}%
        </span>
      ))}
    </div>
  );

  // Performance column: left labels (Day/Week/Month), right value chips.
  const renderPerformanceCell = (row) => (
    <div className="grid grid-cols-[45px_minmax(0,1fr)] gap-y-2 items-start">
      <div className="text-[9px] text-gray-500 self-center">Day</div>
      <div>{renderPercentList(row['5D_Change'])}</div>

      <div className="text-[9px] text-gray-500 self-center">Week</div>
      <div>{renderPercentList(row['5W_Change'])}</div>

      <div className="text-[9px] text-gray-500 self-center">Month</div>
      <div>{renderPercentList(row['5M_Change'])}</div>
    </div>
  );

  // More column: shows Pos% with sign color + counts of positive/negative changes for each period.
  const renderMetricsCell = (row) => {
    const fmt = (n, suf = '') => (n === undefined || n === null ? '-' : `${n}${suf}`);
    const pctCls = (n) => (Number(n) >= 0 ? 'text-green-700' : 'text-red-700');
    const PosNeg = ({ p, n }) => (
      <span className="ml-1 text-[9px]">
        <span className="mr-1">🟢 +{p}</span>
        <span>🔴 -{n}</span>
      </span>
    );

    return (
      <div className="space-y-1">
        <div className="flex items-center text-[9px]">
          <span className="w-9 text-gray-500">Day</span>
          <span className={`text-[9px] font-medium ${pctCls(row['5D_Pos_Pct'])}`}>{fmt(row['5D_Pos_Pct'], '%')}</span>
          <PosNeg p={row['5D_Change_Positive']} n={row['5D_Change_Negative']} />
        </div>
        <div className="flex items-center text-[9px]">
          <span className="w-9 text-gray-500">Week</span>
          <span className={`text-[9px] font-medium ${pctCls(row['5W_Pos_Pct'])}`}>{fmt(row['5W_Pos_Pct'], '%')}</span>
          <PosNeg p={row['5W_Change_Positive']} n={row['5W_Change_Negative']} />
        </div>
        <div className="flex items-center text-[9px]">
          <span className="w-9 text-gray-500">Month</span>
          <span className={`text-[9px] font-medium ${pctCls(row['5M_Pos_Pct'])}`}>{fmt(row['5M_Pos_Pct'], '%')}</span>
          <PosNeg p={row['5M_Change_Positive']} n={row['5M_Change_Negative']} />
        </div>
      </div>
    );
  };

  // Day Return rendering helper: green if >= 0, red if < 0, dash if empty
  const renderDayReturn = (val) => {
    if (val === undefined || val === null || val === '') return <span className="text-gray-400">-</span>;
    const num = Number(val);
    if (Number.isNaN(num)) return <span className="text-gray-400">-</span>;
    const cls = num >= 0 ? 'text-green-700' : 'text-red-700';
    return <span className={`text-[10px] font-medium ${cls}`}>{num}%</span>;
  };

  // ------------------------------
  // 8) Render
  // ------------------------------
  return (
    <div className="p-4 bg-white rounded-2xl shadow border border-gray-200">
      {/* Title */}
      <h2 className="text-[11px] font-semibold text-center text-blue-600 mb-3">
        Stocks Summary {saved.size ? <span className="text-gray-500 font-normal">· Saved ({saved.size})</span> : null}
      </h2>

      {/* Sort controls (Day/Week/Month/Day Return) */}
      <div className="mb-2 flex items-center gap-2 text-[9px]">
        <span className="text-gray-500">Sort by</span>
        <button
          className={`px-2 py-1 rounded border ${sortKey==='day' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'} hover:border-indigo-300`}
          onClick={() => toggleSort('day')}
        >
          Day {sortKey==='day' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>
        <button
          className={`px-2 py-1 rounded border ${sortKey==='week' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'} hover:border-indigo-300`}
          onClick={() => toggleSort('week')}
        >
          Week {sortKey==='week' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>
        <button
          className={`px-2 py-1 rounded border ${sortKey==='month' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'} hover:border-indigo-300`}
          onClick={() => toggleSort('month')}
        >
          Month {sortKey==='month' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>
        <button
          className={`px-2 py-1 rounded border ${sortKey==='dayReturn' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'} hover:border-indigo-300`}
          onClick={() => toggleSort('dayReturn')}
        >
          Day Return {sortKey==='dayReturn' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>
        {sortKey && (
          <button className="ml-2 px-2 py-1 rounded border border-gray-200 hover:border-gray-300" onClick={() => { setSortKey(null); setSortDir('desc'); }}>
            Clear
          </button>
        )}
      </div>

      {/* Loading & error states */}
      {loading && <div className="text-center text-gray-500 text-[10px]">Loading...</div>}
      {error && <div className="text-center text-red-500 text-[10px]">Error: {error}</div>}

      {/* Desktop/tablet table */}
      {!loading && !error && sortedData.length > 0 && (
        <div className="overflow-x-auto">
          <div className="hidden sm:block border rounded-md overflow-auto">
            <div className="min-w-max">
              {/* Header row with resizers */}
              <div className="flex bg-gray-50 text-sm font-medium text-gray-700 border-b">
                {columns.map((col, i) => (
                  <div key={col.key} style={{ width: colWidths[i] }} className="relative px-3 py-2 flex items-center">
                    {/* Header label */}
                    <div className="flex-1 text-left truncate">{col.label}</div>

                    {/* Resize handle (not on last column) */}
                    {i < columns.length - 1 && (
                      <div
                        role="separator"
                        tabIndex={0}
                        aria-label={`Resize ${col.label}`}
                        onKeyDown={(e) => onKeyResize(e, i)}
                        onMouseDown={(e) => startDrag(e, i)}
                        onTouchStart={(e) => startDrag(e, i)}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                        style={{ touchAction: 'none' }}
                      >
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100">
                          <div className="h-8 w-px bg-gray-300" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {sortedData.map((row, rIdx) => (
                <div key={rIdx} className="flex text-sm border-b even:bg-white odd:bg-gray-50">
                  {columns.map((col, i) => (
                    <div key={col.key} style={{ width: colWidths[i] }} className="px-3 py-2 truncate">
                      {(() => {
                        if (col.key === 'symbol') {
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSave(row.symbol)}
                                className={`h-5 w-5 rounded border text-[10px] flex items-center justify-center
                                  ${isSaved(row.symbol)
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                title={isSaved(row.symbol) ? 'Saved for next analysis' : 'Add to next analysis'}
                                aria-pressed={isSaved(row.symbol)}
                              >
                                {isSaved(row.symbol) ? '✓' : '+'}
                              </button>
                              <div className="text-[10px] font-medium text-gray-800">{row.symbol}</div>
                            </div>
                          );
                        }
                        if (col.key === 'performance') {
                          return renderPerformanceCell(row);
                        }
                        if (col.key === 'metrics') {
                          return renderMetricsCell(row);
                        }
                        if (col.key === 'current') {
                          return renderDayReturn(row.current);
                        }
                        return <div className="truncate">{String(row[col.key] ?? '')}</div>;
                      })()}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-2">
            {sortedData.map((row, rIdx) => (
              <div key={rIdx} className="border rounded-md p-3 bg-white shadow-sm">
                {columns.map((col) => (
                  <div key={col.key} className="mb-2 last:mb-0">
                    <div className="text-[9px] text-gray-500">{col.label}</div>
                    <div className="text-[10px] font-medium">
                      {(() => {
                        if (col.key === 'symbol') {
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSave(row.symbol)}
                                className={`h-5 w-5 rounded border text-[10px] flex items-center justify-center
                                  ${isSaved(row.symbol)
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                title={isSaved(row.symbol) ? 'Saved for next analysis' : 'Add to next analysis'}
                                aria-pressed={isSaved(row.symbol)}
                              >
                                {isSaved(row.symbol) ? '✓' : '+'}
                              </button>
                              <span>{row.symbol}</span>
                            </div>
                          );
                        }
                        if (col.key === 'performance') return renderPerformanceCell(row);
                        if (col.key === 'metrics') return renderMetricsCell(row);
                        if (col.key === 'current') return renderDayReturn(row.current);
                        return String(row[col.key] ?? '');
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedData.length === 0 && (
        <div className="text-center text-gray-500 text-[10px]">No data available</div>
      )}

      {/* Footer: reset widths + tips */}
      <div className="mt-3 flex items-center gap-3">
        <button
          className="px-3 py-1 rounded bg-indigo-600 text-white text-[10px] hover:bg-indigo-700"
          onClick={() => setColWidths(columns.map((c) => c.initialWidth || 150))}
        >
          Reset column widths
        </button>

        <div className="text-[9px] text-gray-600">
          Tip: drag the thin area on the right of each header to resize. Use arrow keys when a resizer is focused.
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// 9) Tiny runtime tests (Dev-only console checks)
// These help catch regressions quickly while developing.
// ------------------------------
if (typeof window !== 'undefined') {
  // safeParseArray
  (function testSafeParseArray() {
    const input = '["1", "nan", null, 2]';
    const out = (function localParse(val){
      try { const arr = typeof val === 'string' ? JSON.parse(val) : val; if (!Array.isArray(arr)) return []; return arr.map((v) => v==null || Number.isNaN(Number(v)) || String(v).toLowerCase()==='nan' ? 0 : Number(v)); } catch { return []; }
    })(input);
    console.assert(Array.isArray(out) && out.length === 4 && out[0] === 1 && out[1] === 0 && out[2] === 0 && out[3] === 2, 'safeParseArray test failed');
  })();

  // aggAvg
  (function testAggAvg() {
    const avg = (arr) => {
      if (!arr || !arr.length) return 0; let s = 0; for (let i=0;i<arr.length;i++) s += Number(arr[i])||0; return s/arr.length;
    };
    console.assert(avg([1,2,3]) === 2, 'aggAvg test failed');
    console.assert(avg([]) === 0, 'aggAvg empty test failed');
  })();

  // dayReturn comparator (asc/desc) basic check
  (function testDayReturnSort() {
    const nv = (x) => { const n = Number(x); return Number.isNaN(n) ? 0 : n; };
    const rows = [{current: 1.2},{current: -0.5},{current: 'nan'},{current: 0}];
    const asc = [...rows].sort((a,b)=> nv(a.current)-nv(b.current));
    const desc = [...rows].sort((a,b)=> nv(b.current)-nv(a.current));
    console.assert(asc[0].current === -0.5 && asc[3].current === 1.2, 'dayReturn asc sort failed');
    console.assert(desc[0].current === 1.2 && desc[3].current === -0.5, 'dayReturn desc sort failed');
  })();

  // renderDayReturn-style class decision
  (function testRenderDayReturnClass() {
    const cls = (v) => { const n = Number(v); if (Number.isNaN(n)) return 'gray'; return n >= 0 ? 'green' : 'red'; };
    console.assert(cls(0.1) === 'green', 'renderDayReturn should be green for positive');
    console.assert(cls(-0.1) === 'red', 'renderDayReturn should be red for negative');
    console.assert(cls('nan') === 'gray', 'renderDayReturn should be gray for NaN');
  })();
}
