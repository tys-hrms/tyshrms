import React, { useState } from 'react';
import { ShieldCheck, CheckSquare } from 'lucide-react';

import RBACMatrix from './rbac/RBACMatrix';
import TasksManager from './rbac/TasksManager';
import WorkstationSettings from './settings/WorkstationSettings';

type Tab = 'matrix' | 'tasks' | 'workstations';

export default function RBACPage() {
  const [activeTab, setActiveTab] = useState<Tab>('matrix');

  const tabs = [
    { id: 'matrix', label: 'Permission Matrix', icon: ShieldCheck },
    { id: 'tasks', label: 'Tasks & Profiles Configuration', icon: CheckSquare },
    { id: 'workstations', label: 'Tables & Workstations', icon: CheckSquare },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Access Control & Workflows</h1>
        <p className="text-slate-400 text-sm mt-1">Manage role-based security permissions and warehouse task definitions.</p>
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
        {activeTab === 'matrix' && <RBACMatrix />}
        {activeTab === 'tasks' && <TasksManager />}
        {activeTab === 'workstations' && <WorkstationSettings />}
      </div>
    </div>
  );
}
