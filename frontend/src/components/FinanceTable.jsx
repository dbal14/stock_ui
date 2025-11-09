import React, { useEffect, useMemo, useRef, useState } from "react";

const data = [
  {
    Name: "Aadhar Hsg. Fin.",
    BSECode: 544176.0,
    NSECode: "AADHARHFC",
    IndustryGroup: "Finance",
    Industry: "Housing Finance Company",
    CurrentPrice: 494.55,
    MarketCapitalization: 21419,
    Return1Day: -0.98,
    Return1Week: -3.0,
    Return1Month: -4.06,
    Return3Months: -2.41,
    Return6Months: 7.38,
    Return1Year: 7.55,
    From52wHigh: 0.9,
    DMA50: 509.59,
    DMA200: 474.18,
    RSI: 36.49,
    MACD: -3.22,
    HighPrice: 547.8,
    LowPrice: 340.5,
    CapRange: "10000 - 30000",
  },
  {
    Name: "AAVAS Financiers",
    BSECode: 541988.0,
    NSECode: "AAVAS",
    IndustryGroup: "Finance",
    Industry: "Housing Finance Company",
    CurrentPrice: 1574.1,
    MarketCapitalization: 12462,
    Return1Day: -1.86,
    Return1Week: -4.6,
    Return1Month: -3.53,
    Return3Months: -8.12,
    Return6Months: -12.6,
    Return1Year: -5.31,
    From52wHigh: 0.7,
    DMA50: 1653.24,
    DMA200: 1730.56,
    RSI: 37.11,
    MACD: -4.92,
    HighPrice: 2238.35,
    LowPrice: 1516.9,
    CapRange: "10000 - 30000",
  },
  {
    Name: "Aditya Birla Cap",
    BSECode: 540691.0,
    NSECode: "ABCAPITAL",
    IndustryGroup: "Finance",
    Industry: "Investment Company",
    CurrentPrice: 338.1,
    MarketCapitalization: 88336,
    Return1Day: 3.38,
    Return1Week: 4.29,
    Return1Month: 15.25,
    Return3Months: 24.67,
    Return6Months: 65.02,
    Return1Year: 68.12,
    From52wHigh: 0.98,
    DMA50: 300.19,
    DMA200: 255.11,
    RSI: 71.4,
    MACD: 10.39,
    HighPrice: 345.4,
    LowPrice: 148.75,
    CapRange: "50000+",
  },
];

export default function FinanceTable() {
  // All available columns
  const allColumns = useMemo(() => (data.length ? Object.keys(data[0]) : []), []);

  // Columns selected to display (default: all)
  const [selectedColumns, setSelectedColumns] = useState(allColumns);

  // Dropdown open/close
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close on outside click / Esc
  useEffect(() => {
    function onDocClick(e) {
      if (open && popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allSelected = selectedColumns.length === allColumns.length;

  const toggleColumn = (col) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedColumns(checked ? allColumns : []);
  };

  const handleReset = () => setSelectedColumns(allColumns);

  const visibleColumns = selectedColumns;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Finance Data Table</h2>

        {/* Column chooser icon button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
            title="Choose columns"
          >
            {/* Simple slider/settings icon (inline SVG) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M4 6.75h8.25m7.5 0H15M4 12h6m10.5 0H12M4 17.25h3.75m12 0h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">Columns</span>
          </button>

          {/* Popover */}
          {open && (
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Show columns</div>
                <button
                  onClick={handleReset}
                  className="text-xs underline hover:no-underline"
                >
                  Reset
                </button>
              </div>

              {/* Select all */}
              <label className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="text-sm">Select all</span>
              </label>

              <div className="max-h-64 overflow-auto pr-1">
                {allColumns.map((col) => (
                  <label
                    key={col}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                    />
                    <span className="truncate" title={col}>{col}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100 font-semibold">
            <tr>
              {visibleColumns.length === 0 ? (
                <th className="border px-2 py-1 text-left">No columns selected</th>
              ) : (
                visibleColumns.map((key) => (
                  <th key={key} className="border px-2 py-1 whitespace-nowrap">
                    {key}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {visibleColumns.length === 0 ? (
                  <td className="border px-2 py-1 text-center text-gray-500" colSpan={1}>
                    Use the Columns button to choose fields
                  </td>
                ) : (
                  visibleColumns.map((col) => (
                    <td key={col} className="border px-2 py-1 whitespace-nowrap text-center">
                      {row[col]}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
