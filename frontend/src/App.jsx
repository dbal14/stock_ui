// App.jsx
import React, { useEffect, useState } from 'react';
import MarketOverview from './components/MarketOverview';
import Sidebar from './components/Sidebar';
import SummaryDashboard from './components/DayWeekMonthPerfermance';
import PeopleStocksDashboard from './components/PeopleStocksDashboard';
import FinanceTable from './components/FinanceTable'; // ⬅️ import this

export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [active, setActive] = useState('Home'); // ⬅️ track which view is active

  useEffect(() => {
    fetch('http://localhost:4000/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data.metrics || []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <Sidebar
        onAddNew={() => alert('+ Add New clicked')}
        onNavigate={setActive}        // ⬅️ pass setter
        active={active}               // ⬅️ pass current tab
      />

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            {active === 'Market' ? 'Market — Finance Table' : 'Dashboard Overview'}
          </h2>
          <input
            className="hidden md:block rounded-xl border border-gray-300 px-3 py-2 text-sm w-64"
            placeholder="Search..."
          />
        </div>

        {/* Conditional content */}
        {active === 'Market' ? (
          <FinanceTable />                // ⬅️ show your table when Market is active
        ) : (
          <>
            <MarketOverview metrics={metrics} />
            <section className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Day / Week / Month Summary</h3>
              <SummaryDashboard apiUrl="http://127.0.0.1:4000/api/summary" />
              <h3 className="text-xl font-semibold mb-4">People Stocks (P/L)</h3>
              <PeopleStocksDashboard apiUrl="http://127.0.0.1:4000/api/client" />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
