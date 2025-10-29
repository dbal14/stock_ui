import React, { useEffect, useState } from "react";

const SummaryDashboard = ({ apiUrl = "http://127.0.0.1:4000/api/summary" }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // The API returns { summary: [ {...}, {...} ] }
        const parsed = json.summary.map(item => ({
          ...item,
          "5D_Change": JSON.parse(item["5D_Change"]),
          "5W_Change": JSON.parse(item["5W_Change"]),
          "5M_Change": JSON.parse(item["5M_Change"])
        }));

        setData(parsed);
      } catch (err) {
        console.error("Error fetching summary data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  return (
    <div className="p-6 bg-white rounded-2xl shadow border border-gray-200">
      <h2 className="text-xl font-semibold text-center text-blue-600 mb-4">Stocks Summary</h2>

      {loading && <div className="text-center text-gray-500">Loading...</div>}
      {error && <div className="text-center text-red-500">Error: {error}</div>}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-xs text-gray-800 uppercase tracking-wide">Stock Name</th>
                <th className="px-4 py-2 text-xs text-gray-800 uppercase tracking-wide">5 Day Performance</th>
                <th className="px-4 py-2 text-xs text-gray-800 uppercase tracking-wide">Weekly Performance</th>
                <th className="px-4 py-2 text-xs text-gray-800 uppercase tracking-wide">Monthly Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-700">{item.symbol}</td>

                  <td className="px-4 py-2 text-xs">
                    {item["5D_Change"].map((val, i) => (
                      <span key={i} className={`mr-1 ${val >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {val}%
                      </span>
                    ))}
                  </td>

                  <td className="px-4 py-2 text-xs">
                    {item["5W_Change"].map((val, i) => (
                      <span key={i} className={`mr-1 ${val >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {val}%
                      </span>
                    ))}
                  </td>

                  <td className="px-4 py-2 text-xs">
                    {item["5M_Change"].map((val, i) => (
                      <span key={i} className={`mr-1 ${val >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {val}%
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="text-center text-gray-500">No data available</div>
      )}
    </div>
  );
};

export default SummaryDashboard;