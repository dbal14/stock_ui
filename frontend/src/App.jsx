

import React, { useEffect, useState } from 'react';
import AutoTable from './components/AutoTable';
import MarketOverview from './components/MarketOverview';
import Sidebar from './components/Sidebar';


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


return (
<div className="flex h-screen bg-gray-100 text-gray-900">
{/* Replaced the in-file aside with a Sidebar component */}
<Sidebar onAddNew={() => alert('+ Add New clicked')} />


<main className="flex-1 p-6 overflow-y-auto">
{/* rest of your App stays the same */}


<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-semibold">Dashboard Overview</h2>
<input className="hidden md:block rounded-xl border border-gray-300 px-3 py-2 text-sm w-64" placeholder="Search..." />
</div>


<MarketOverview metrics={metrics} />


{/* Charts and other content remain unchanged (just copy/paste from your original App.jsx) */}


</main>
</div>
);
}