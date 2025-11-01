import React, { useEffect, useState, useRef } from 'react';

export default function SummaryResizableTable({
  apiUrl = 'http://127.0.0.1:4000/api/summary',
  initialColumns,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Two columns only
  const defaultColumns = [
    { key: 'symbol', label: 'Stock Name', initialWidth: 260 },
    { key: 'performance', label: 'Performance', initialWidth: 700 },
  ];
  const columns = initialColumns || defaultColumns;

  // column widths state (px)
  const [colWidths, setColWidths] = useState(() =>
    columns.map((c) => c.initialWidth || 150)
  );

  // dragging state kept in ref to avoid re-renders
  const dragState = useRef({ dragging: false, startX: 0, colIndex: null, startWidths: [] });

  // --- move/onUp handlers defined once so they can be added/removed reliably ---
  const onMove = (e) => {
    if (!dragState.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = clientX - dragState.current.startX;
    const idx = dragState.current.colIndex;
    const newWidths = [...dragState.current.startWidths];
    const minWidth = 60;
    const maxDelta = newWidths[idx + 1] ? newWidths[idx + 1] - minWidth : delta;
    const appliedDelta = Math.max(-newWidths[idx] + minWidth, Math.min(delta, maxDelta));
    newWidths[idx] = Math.max(minWidth, dragState.current.startWidths[idx] + appliedDelta);
    if (newWidths[idx + 1] !== undefined)
      newWidths[idx + 1] = Math.max(minWidth, dragState.current.startWidths[idx + 1] - appliedDelta);
    setColWidths(newWidths);
    e.preventDefault();
  };

  const onUp = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  };

  // startDrag now registers listeners immediately so dragging works
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

  const onKeyResize = (e, idx) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = [...colWidths];
      const minWidth = 60;
      const delta = dir * step;
      const allowedDelta = Math.max(-next[idx] + minWidth, Math.min(delta, next[idx + 1] ? next[idx + 1] - minWidth : delta));
      next[idx] = Math.max(minWidth, next[idx] + allowedDelta);
      if (next[idx + 1] !== undefined) next[idx + 1] = Math.max(minWidth, next[idx + 1] - allowedDelta);
      setColWidths(next);
      e.preventDefault();
    }
  };

  // helper: safely parse JSON arrays and replace nan with 0
  const safeParseArray = (val) => {
    try {
      const arr = typeof val === 'string' ? JSON.parse(val) : val;
      if (!Array.isArray(arr)) return [];
      return arr.map((v) =>
        v === null ||
        v === undefined ||
        Number.isNaN(Number(v)) ||
        String(v).toLowerCase() === 'nan'
          ? 0
          : Number(v)
      );
    } catch (err) {
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const parsed = (json.summary || []).map((item) => ({
          ...item,
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

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [apiUrl]);

  // small value "chips"
  const renderPercentList = (arr = []) => (
    <div className="flex flex-wrap items-center">
      {arr.map((val, i) => (
        <span
          key={i}
          className={`mr-1 mb-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] border ${
            val >= 0
              ? 'text-green-700 border-green-200 bg-green-50'
              : 'text-red-700 border-red-200 bg-red-50'
          }`}
        >
          {val}%
        </span>
      ))}
    </div>
  );

  // Performance cell: labels on left, values on right; very tight spacing
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

  return (
    <div className="p-4 bg-white rounded-2xl shadow border border-gray-200">
      <h2 className="text-[11px] font-semibold text-center text-blue-600 mb-4">Stocks Summary</h2>

      {loading && <div className="text-center text-gray-500 text-[10px]">Loading...</div>}
      {error && <div className="text-center text-red-500 text-[10px]">Error: {error}</div>}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <div className="hidden sm:block border rounded-md overflow-auto">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex bg-gray-50 text-sm font-medium text-gray-700 border-b">
                {columns.map((col, i) => (
                  <div key={col.key} style={{ width: colWidths[i] }} className="relative px-3 py-2 flex items-center">
                    <div className="flex-1 text-left truncate">{col.label}</div>

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

              {/* Rows */}
              {data.map((row, rIdx) => (
                <div key={rIdx} className="flex text-sm border-b even:bg-white odd:bg-gray-50">
                  {columns.map((col, i) => (
                    <div key={col.key} style={{ width: colWidths[i] }} className="px-3 py-2 truncate">
                      {col.key === 'symbol' ? (
                        <div className="text-[10px] font-medium text-gray-800">{row.symbol}</div>
                      ) : col.key === 'performance' ? (
                        renderPerformanceCell(row)
                      ) : (
                        <div className="truncate">{String(row[col.key] ?? '')}</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile stacked */}
          <div className="sm:hidden space-y-2">
            {data.map((row, rIdx) => (
              <div key={rIdx} className="border rounded-md p-3 bg-white shadow-sm">
                {columns.map((col) => (
                  <div key={col.key} className="mb-2 last:mb-0">
                    <div className="text-[9px] text-gray-500">{col.label}</div>
                    <div className="text-[10px] font-medium">
                      {col.key === 'symbol'
                        ? row.symbol
                        : col.key === 'performance'
                        ? renderPerformanceCell(row)
                        : String(row[col.key] ?? '')}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && data.length === 0 && <div className="text-center text-gray-500 text-[10px]">No data available</div>}

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
