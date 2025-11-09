// App.jsx
import React, { useEffect, useState } from 'react';
import MarketOverview from './components/MarketOverview';
import Sidebar from './components/Sidebar';
import SummaryDashboard from './components/DayWeekMonthPerfermance';
import PeopleStocksDashboard from './components/PeopleStocksDashboard';
import FinanceTable from './components/FinanceTable';

// ---- Views enum (must match Sidebar labels exactly) ----
const VIEWS = {
  HOME: 'Home',
  MARKET: 'Market',
  TECHNICAL: 'Technical',
  CLINT: 'Clint',
  PEER_ANALYSIS: 'Peer Analysis',
  TRANSACTIONS: 'Transactions',
  ANALYTICS: 'Analytics',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',
};

export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [active, setActive] = useState(VIEWS.HOME);

  useEffect(() => {
    fetch('http://localhost:4000/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data.metrics || []))
      .catch(() => {});
  }, []);

  const titleByView = () => {
    switch (active) {
      case VIEWS.MARKET:
        return 'Market — Finance Table';
      case VIEWS.TECHNICAL:
        return 'Technical — Overview & Summaries';
      case VIEWS.CLINT:
        return 'Clint';
      case VIEWS.PEER_ANALYSIS:
        return 'Peer Analysis';
      case VIEWS.TRANSACTIONS:
        return 'Transactions';
      case VIEWS.ANALYTICS:
        return 'Analytics';
      case VIEWS.REPORTS:
        return 'Reports';
      case VIEWS.SETTINGS:
        return 'Settings';
      default:
        return 'Dashboard Overview';
    }
  };

  const renderContent = () => {
    switch (active) {
      case VIEWS.MARKET:
        // Show FinanceTable only
        return <FinanceTable />;

      case VIEWS.TECHNICAL:
        // Technical: MarketOverview + Summary + PeopleStocks
        return (
          <>

            <section className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Day / Week / Month Summary</h3>
              <SummaryDashboard apiUrl="http://127.0.0.1:4000/api/summary" />
              
            </section>
          </>
        );

      case VIEWS.CLINT:
        // 👉 Add your Clint component(s) here
        return (
          <section>
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
             <h3 className="text-xl font-semibold mb-4">People Stocks (P/L)</h3>
              <PeopleStocksDashboard apiUrl="http://127.0.0.1:4000/api/client" />
            </div>
          </section>
        );

      case VIEWS.PEER_ANALYSIS:
        // 👉 Add your Peer Analysis component(s) here
        return (
          <section>
            <h3 className="text-xl font-semibold mb-4">Peer Analysis</h3>
            {/* <PeerAnalysis ... /> */}
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
              Drop your <strong>Peer Analysis</strong> components here.
            </div>
          </section>
        );

      case VIEWS.TRANSACTIONS:
        // 👉 Add your Transactions component(s) here
        return (
          <section>
            <h3 className="text-xl font-semibold mb-4">Transactions</h3>
            {/* <Transactions ... /> */}
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
              Drop your <strong>Transactions</strong> components here.
            </div>
          </section>
        );

      case VIEWS.ANALYTICS:
        // 👉 Add your Analytics component(s) here
        return (
          <section>
            <h3 className="text-xl font-semibold mb-4">Analytics</h3>
            {/* <Analytics ... /> */}
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
              Drop your <strong>Analytics</strong> components here.
            </div>
          </section>
        );

      case VIEWS.REPORTS:
        // 👉 Add your Reports component(s) here
        return (
          <section>
            <h3 className="text-xl font-semibold mb-4">Reports</h3>
            {/* <Reports ... /> */}
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
              Drop your <strong>Reports</strong> components here.
            </div>
          </section>
        );

      case VIEWS.SETTINGS:
        // 👉 Add your Settings component(s) here
        return (
          <section>
            <h3 className="text-xl font-semibold mb-4">Settings</h3>
            {/* <Settings ... /> */}
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
              Drop your <strong>Settings</strong> components here.
            </div>
          </section>
        );

      case VIEWS.HOME:
      default:
        // Home shows ONLY MarketOverview (no Summary, no PeopleStocks)
        return <MarketOverview metrics={metrics} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <Sidebar
        onAddNew={() => alert('+ Add New clicked')}
        onNavigate={setActive}
        active={active}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">{titleByView()}</h2>
          <input
            className="hidden md:block rounded-xl border border-gray-300 px-3 py-2 text-sm w-64"
            placeholder="Search..."
          />
        </div>

        {/* View content */}
        {renderContent()}
      </main>
    </div>
  );
}
