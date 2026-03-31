import React, { useState } from 'react';
import { Store, Database, Clock, User, Building2 } from 'lucide-react';

import ShopifySettings from './settings/ShopifySettings';
import ShiftSettings from './settings/ShiftSettings';
import MongoSettings from './settings/MongoSettings';
import ProfileSettings from './settings/ProfileSettings';
import LocationSettings from './settings/LocationSettings';
import AutomationSettings from './settings/AutomationSettings';

type Tab = 'shopify' | 'shifts' | 'mongodb' | 'profile' | 'locations' | 'automation';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'locations', label: 'Locations (HQ/Branch)', icon: Building2 },
    { id: 'mongodb', label: 'MongoDB Atlas', icon: Database },
    { id: 'automation', label: 'Automation & Sync', icon: Clock },
    { id: 'shifts', label: 'Shift Intervals', icon: Clock },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure global application parameters and integrations.</p>
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
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'locations' && <LocationSettings />}
        { activeTab === 'mongodb' && <MongoSettings />}
        { activeTab === 'automation' && <AutomationSettings />}
        { activeTab === 'shifts' && <ShiftSettings />}
      </div>
    </div>
  );
}
