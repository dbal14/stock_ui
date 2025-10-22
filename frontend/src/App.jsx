import React, { useEffect, useState } from 'react';
import AutoTable from './components/AutoTable';
import MetricsGrid from './components/MarketOverview';
import {
  Home,
  FileText,
  BarChart2,
  Settings,
  TrendingUp,
  LineChart as IconLineChart,
  Briefcase,
  PieChart as IconPieChart,
  DollarSign,
} from 'lucide-react';

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

  const SidebarLink = ({ icon: Icon, label }) => (
    <a href="#" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-indigo-800 transition text-white">
      <Icon size={18} /> <span>{label}</span>
    </a>
  );

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <aside className="w-44 bg-indigo-900 text-white flex flex-col p-4">
        <div className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium inline-block mb-4">
          Dashboard
        </div>
        <nav className="space-y-2 flex-grow">
          <SidebarLink icon={Home} label="Home" />
          <SidebarLink icon={TrendingUp} label="Market" />
          <SidebarLink icon={IconLineChart} label="Upside" />
          <SidebarLink icon={Briefcase} label="Technical" />
          <SidebarLink icon={IconPieChart} label="Peer Analysis" />
          <SidebarLink icon={DollarSign} label="Transactions" />
          <SidebarLink icon={BarChart2} label="Analytics" />
          <SidebarLink icon={FileText} label="Reports" />
          <SidebarLink icon={Settings} label="Settings" />
        </nav>

        <button className="mt-4 bg-orange-600 hover:bg-orange-500 rounded-xl px-4 py-2 text-sm font-medium">
          + Add New
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {/* <AutoTable /> */}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
          <input className="hidden md:block rounded-xl border border-gray-300 px-3 py-2 text-sm w-64" placeholder="Search..." />
        </div>
            <MetricsGrid metrics={metrics} />
            
            {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card lg:col-span-2">
            <div className="font-semibold mb-2">Weekly Overview</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData.length ? barData : [{name:'Mon',value:0}]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="font-semibold mb-2">Order Completion</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={pieData.length ? pieData : [{name:'Completed', value:0}]} dataKey="value" innerRadius={50} outerRadius={70}>
                    {(pieData.length ? pieData : [{},{ }]).map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-lg font-bold mt-2">{pieData[0] ? `${pieData[0].value}% Completed` : '0% Completed'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-semibold mb-2">Sales Analytics</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={lineData.length ? lineData : [{name:'Mon', uv:0}]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="uv" stroke="#6366F1" strokeWidth={2} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="font-semibold mb-2">Incoming Invoices</div>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>Invoice #12345 — $230</li>
              <li>Invoice #12346 — $540</li>
              <li>Invoice #12347 — $410</li>
              <li>Invoice #12348 — $290</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
