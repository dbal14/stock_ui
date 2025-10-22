import React from 'react';
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


export default function Sidebar({ onAddNew = () => {} }) {
const links = [
{ icon: Home, label: 'Home' },
{ icon: TrendingUp, label: 'Market' },
{ icon: IconLineChart, label: 'Upside' },
{ icon: Briefcase, label: 'Technical' },
{ icon: IconPieChart, label: 'Peer Analysis' },
{ icon: DollarSign, label: 'Transactions' },
{ icon: BarChart2, label: 'Analytics' },
{ icon: FileText, label: 'Reports' },
{ icon: Settings, label: 'Settings' },
];


const SidebarLink = ({ icon: Icon, label }) => (
<a
href="#"
className="flex items-center gap-3 px-3 py-2 rounded hover:bg-indigo-800 transition text-white"
>
<Icon size={18} /> <span>{label}</span>
</a>
);


return (
<aside className="w-44 bg-indigo-900 text-white flex flex-col p-4">
<div className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium inline-block mb-4">
Dashboard
</div>


{/* <nav className="space-y-2 flex-grow margin-bottom"> */}
<nav className="sidebar-nav sidebar-link sidebar-link:hover flex-grow margin-bottom">
{links.map((lnk) => (
<SidebarLink key={lnk.label} icon={lnk.icon} label={lnk.label} />
))}
</nav>


<button
onClick={onAddNew}
className="mt-4 bg-orange-600 hover:bg-orange-500 rounded-xl px-4 py-2 text-sm font-medium"
>
+ Add New
</button>
</aside>
);
}