import React, { useEffect, useState } from "react";

export default function StocksGrid({ apiUrl = "http://localhost:4000/api/stocks" }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setStocks(data.stocks || []);
      } catch (err) {
        console.error("Error fetching stocks:", err);
        setError("Failed to load stock data. Please check your Flask server.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [apiUrl]);

  if (loading) {
    return <div className="text-center text-gray-600 mt-8">Loading stock data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 mt-8">{error}</div>;
  }

  if (!stocks.length) {
    return <div className="text-center text-gray-600 mt-8">No stock data available.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {stocks.map((stock, index) => {
        const isPositive = (val) => val && val.startsWith("+");
        return (
          <div
            key={index}
            className="bg-white shadow-md rounded-2xl p-4 text-center border border-gray-100 hover:shadow-lg transition-all duration-300"
          >
            <h3 className="text-lg font-semibold text-blue-700 mb-3">{stock.name}</h3>
 <div className="text-gray-700 flex justify-center items-center gap-6 text-sm mt-2">
  <p>
    <span className="font-medium">Day:</span>{" "}
    <span className={isPositive(stock.day_return) ? "text-green-600" : "text-red-600"}>
      {stock.day_return}
    </span>
  </p>
  <p>
    <span className="font-medium">Week:</span>{" "}
    <span className={isPositive(stock.weekly_return) ? "text-green-600" : "text-red-600"}>
      {stock.weekly_return}
    </span>
  </p>
  <p>
    <span className="font-medium">Month:</span>{" "}
    <span className={isPositive(stock.monthly_return) ? "text-green-600" : "text-red-600"}>
      {stock.monthly_return}
    </span>
  </p>
</div>

          </div>
        );
      })}
    </div>
  );
}
