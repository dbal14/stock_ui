import React, { useEffect, useState } from 'react';
import MarketOverview from './components/MarketOverview';
import Sidebar from './components/Sidebar';
import StocksGrid from './components/StocksGrid'; // <-- new import

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';


export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [barData, setBarData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [pieData, setPieData] = useState([]);

  useEffect(() => {
    // existing metrics fetch (keep if you still need)
    fetch('http://localhost:4000/api/metrics')
.then(res => res.json())
.then(data => setMetrics(data.metrics))
.catch(()=>{});


    fetch('http://localhost:4000/api/weekly')
.then(res => res.json())
.then(data => {
setBarData(data.bar);
setLineData(data.line);
setPieData(data.pie);
}).catch(()=>{});
  }, []);


  const COLORS = ['#6366F1', '#E5E7EB'];


  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
{/* Replaced the in-file aside with a Sidebar component */}
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

        {/* Stocks grid (uses your Flask /api/stocks) */}
        <section className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Stocks Performance</h3>
          {/* Defaults to whatever StocksGrid uses if you don't pass apiUrl.
              To override, pass apiUrl="http://localhost:5000/api/stocks" */}
          <StocksGrid apiUrl="http://127.0.0.1:4000/api/stocks" />
        </section>

        {/* Example: your existing charts (bar / line / pie) can be displayed below.
            I'm leaving placeholders so you can plug your charts that use barData, lineData, pieData. */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart panel */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h4 className="font-medium mb-2">Weekly Bar</h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line chart panel */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h4 className="font-medium mb-2">12-Week Trend</h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <RechartsLineChart data={lineData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="uv" stroke="#6366F1" strokeWidth={2} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart panel */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h4 className="font-medium mb-2">Order Status</h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <RechartsPieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
