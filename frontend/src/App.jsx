// App.jsx
import React, { useEffect, useState } from 'react';
import MarketOverview from './components/MarketOverview';
import Sidebar from './components/Sidebar';
import StocksGrid from './components/StocksGrid';
import SummaryDashboard from './components/DayWeekMonthPerfermance'; // Day/Week/Month component

export default function App() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data.metrics || []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <Sidebar onAddNew={() => alert('+ Add New clicked')} />

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
          <input
            className="hidden md:block rounded-xl border border-gray-300 px-3 py-2 text-sm w-64"
            placeholder="Search..."
          />
        </div>

        {/* Market overview / metric cards */}
        <MarketOverview metrics={metrics} />

        {/* Stocks grid */}
        <section className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Stocks Performance</h3>
          <StocksGrid apiUrl="http://127.0.0.1:4000/api/stocks" />
        </section>

        {/* Only Summary Dashboard section */}
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Day / Week / Month Summary</h3>
          <SummaryDashboard apiUrl="http://127.0.0.1:4000/api/summary" />
        </section>
      </main>
    </div>
  );
}
