// Sidebar.jsx
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

export default function Sidebar({ onAddNew = () => {}, onNavigate = () => {}, active = 'Home' }) {
  const links = [
    { icon: Home, label: 'Home' },
    { icon: TrendingUp, label: 'Market' },        // ⬅️ clicking this will show FinanceTable
    { icon: IconLineChart, label: 'Clint' },
    { icon: Briefcase, label: 'Technical' },
    { icon: IconPieChart, label: 'Peer Analysis' },
    { icon: DollarSign, label: 'Transactions' },
    { icon: BarChart2, label: 'Analytics' },
    { icon: FileText, label: 'Reports' },
    { icon: Settings, label: 'Settings' },
  ];

  const SidebarLink = ({ icon: Icon, label, isActive, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded transition text-white
        ${isActive ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`}
    >
      <Icon size={18} /> <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-44 bg-indigo-900 text-white flex flex-col p-4">
      <div className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium inline-block mb-4">
        Dashboard
      </div>

      <nav className="flex-grow space-y-1">
        {links.map((lnk) => (
          <SidebarLink
            key={lnk.label}
            icon={lnk.icon}
            label={lnk.label}
            isActive={active === lnk.label}
            onClick={() => onNavigate(lnk.label)}   // ⬅️ tell App which tab to show
          />
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
