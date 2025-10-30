import React, { useEffect, useState, useRef } from 'react';

// SummaryResizableTable
// - Fetches summary data from API (same parsing you used)
// - Replaces NaN with 0 inside array fields
// - Renders a resizable table (drag handles + keyboard)
// - Responsive: stacks rows on small screens
// - Props: apiUrl, initialColumns (optional)

export default function SummaryResizableTable({
  apiUrl = 'http://127.0.0.1:4000/api/summary',
  initialColumns,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // default columns if user doesn't pass any
  const defaultColumns = [
    { key: 'symbol', label: 'Stock Name', initialWidth: 220 },
    { key: '5D_Change', label: '5 Day Performance', initialWidth: 320 },
    { key: '5W_Change', label: 'Weekly Performance', initialWidth: 320 },
    { key: '5M_Change', label: 'Monthly Performance', initialWidth: 320 },
  ];

  const columns = initialColumns || defaultColumns;

  // column widths state (px)
  const [colWidths, setColWidths] = useState(() => columns.map((c) => c.initialWidth || 150));

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
    let appliedDelta = Math.max(-newWidths[idx] + minWidth, Math.min(delta, maxDelta));
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
    // prevent text selection while dragging
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    // prevent default to avoid unexpected browser behaviors
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
      return arr.map((v) => (v === null || v === undefined || Number.isNaN(Number(v)) || String(v).toLowerCase() === 'nan' ? 0 : Number(v)));
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

    // cleanup on unmount: ensure listeners removed
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [apiUrl]);

  const renderPercentList = (arr = []) => (
    <div className="flex flex-wrap items-center">
      {arr.map((val, i) => (
        <span key={i} className={`mr-1 text-xs ${val >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {val}%
        </span>
      ))}
    </div>
  );

  return (
    <div className="p-4 bg-white rounded-2xl shadow border border-gray-200">
      <h2 className="text-lg font-semibold text-center text-blue-600 mb-4">Stocks Summary</h2>

      {loading && <div className="text-center text-gray-500">Loading...</div>}
      {error && <div className="text-center text-red-500">Error: {error}</div>}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <div className="hidden sm:block border rounded-md overflow-auto">
            <div className="min-w-max">
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

              {data.map((row, rIdx) => (
                <div key={rIdx} className={`flex text-sm border-b even:bg-white odd:bg-gray-50`}>
                  {columns.map((col, i) => (
                    <div key={col.key} style={{ width: colWidths[i] }} className="px-3 py-2 truncate">
                      {col.key === 'symbol' ? (
                        <div className="text-xs text-gray-700">{row.symbol}</div>
                      ) : col.key === '5D_Change' ? (
                        renderPercentList(row['5D_Change'])
                      ) : col.key === '5W_Change' ? (
                        renderPercentList(row['5W_Change'])
                      ) : col.key === '5M_Change' ? (
                        renderPercentList(row['5M_Change'])
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
                {columns.map((col, i) => (
                  <div key={col.key} className="mb-2 last:mb-0">
                    <div className="text-xs text-gray-500">{col.label}</div>
                    <div className="text-sm font-medium truncate">
                      {col.key === 'symbol' ? row.symbol : Array.isArray(row[col.key]) ? row[col.key].map((v,i)=>(<span key={i} className={`mr-1 text-xs ${v>=0? 'text-green-700':'text-red-700'}`}>{v}%</span>)) : String(row[col.key] ?? '')}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && data.length === 0 && <div className="text-center text-gray-500">No data available</div>}

      <div className="mt-3 flex items-center gap-3">
        <button
          className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          onClick={() => setColWidths(columns.map((c) => c.initialWidth || 150))}
        >
          Reset column widths
        </button>

        <div className="text-sm text-gray-600">Tip: drag the thin area on the right of each header to resize. Use arrow keys when a resizer is focused.</div>
      </div>
    </div>
  );
}
