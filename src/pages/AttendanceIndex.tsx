import React, { useState } from 'react';
import { CalendarDays, Plane } from 'lucide-react';

import AttendancePage from './attendance/AttendancePage';
import LeaveManagement from './attendance/LeaveManagement';

type Tab = 'attendance' | 'leaves';

export default function AttendanceIndex() {
  const [activeTab, setActiveTab] = useState<Tab>('attendance');

  const tabs = [
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarDays },
    { id: 'leaves', label: 'Leave Requests', icon: Plane },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Time & Attendance</h1>
        <p className="text-slate-400 text-sm mt-1">Track working hours, breaks, and manage time off.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as Tab)}
                 className={`flex items-center pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                   isActive 
                     ? 'border-custom-blue text-custom-blue' 
                     : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                 }`}
               >
                 <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-custom-blue' : 'text-slate-500'}`} />
                 {tab.label}
               </button>
            );
         })}
        </nav>
      </div>

      {/* Tab Content Area */}
      <div className="pt-4">
        {activeTab === 'attendance' && <AttendancePage />}
        {activeTab === 'leaves' && <LeaveManagement />}
      </div>
    </div>
  );
}
