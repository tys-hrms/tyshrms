import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Clock, 
  User, 
  Building2, 
  Palette, 
  Layers, 
  IndianRupee, 
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Store,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import ShopifySettings from './settings/ShopifySettings';
import ShiftSettings from './settings/ShiftSettings';
import MongoSettings from './settings/MongoSettings';
import ProfileSettings from './settings/ProfileSettings';
import LocationSettings from './settings/LocationSettings';
import AutomationSettings from './settings/AutomationSettings';
import LookFeelSettings from './settings/LookFeelSettings';
import AISettings from './settings/AISettings';
import CRMSettings from './settings/CRMSettings';
import PayrollSettings from './settings/PayrollSettings';
import DangerZone from './settings/DangerZone';

type Tab = 'identity' | 'profile' | 'payroll' | 'shifts' | 'locations' | 'crm' | 'ai' | 'automation' | 'mongodb' | 'shopify' | 'danger';

interface SettingCategory {
  title: string;
  icon: any;
  items: { 
    id: Tab; 
    label: string; 
    icon: any; 
    description: string;
  }[];
}

export default function SettingsPage() {
  const { session } = useAuth();
  const userRole = session.currentUser?.role || 'Worker';
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: SettingCategory[] = useMemo(() => {
    const baseCategories: SettingCategory[] = [
      {
        title: 'Identity & Branding',
        icon: Palette,
        items: [
          { id: 'identity', label: 'Look & Feel', icon: Palette, description: 'Themes, Colors, Logos' },
          { id: 'profile', label: 'My Personal Profile', icon: User, description: 'Security & Info' }
        ]
      },
      {
        title: 'Human Resources (HRMS)',
        icon: Users,
        items: [
          { id: 'payroll', label: 'Payroll & Regional', icon: IndianRupee, description: 'GST, PF, Tax, States' },
          { id: 'shifts', label: 'Shift Intervals', icon: Clock, description: 'Timing & Overtime' },
          { id: 'locations', label: 'Operation Centers', icon: Building2, description: 'Branch & Site Setup' }
        ]
      },
      {
        title: 'Operational Intelligence',
        icon: Zap,
        items: [
          { id: 'crm', label: 'CRM Configuration', icon: Layers, description: 'Stages & Lifecycle' },
          { id: 'ai', label: 'AI Assistant', icon: Cpu, description: 'Automation & NLP' },
          { id: 'automation', label: 'Workflow Sync', icon: Clock, description: 'Background Tasks' }
        ]
      },
      {
        title: 'Advanced Infrastructure',
        icon: Database,
        items: [
          { id: 'mongodb', label: 'Cloud Database', icon: ShieldCheck, description: 'Atlas Connectivity' },
          { id: 'shopify', label: 'Shopify Store', icon: Store, description: 'SKU Synchronization' }
        ]
      }
    ];

    if (userRole === 'Admin') {
      baseCategories.push({
        title: 'Enterprise Safety',
        icon: ShieldAlert,
        items: [
          { id: 'danger', label: 'Danger Zone', icon: AlertOctagon, description: 'Factory Reset' }
        ]
      });
    }

    return baseCategories;
  }, [userRole]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery, categories]);

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 shrink-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-xs mt-1">Configure global application parameters.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search settings..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-custom-blue outline-none transition-all"
          />
        </div>

        {/* Categories */}
        <nav className="space-y-6">
          {filteredItems.map(cat => (
            <div key={cat.title}>
              <h4 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <cat.icon className="w-3 h-3" />
                {cat.title}
              </h4>
              <div className="space-y-1">
                {cat.items.map(item => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between group p-3 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-custom-blue/10 border border-custom-blue/20 text-white' 
                          : 'hover:bg-slate-900 border border-transparent text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-custom-blue text-white' : 'bg-slate-950 text-slate-500 group-hover:bg-slate-800'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-bold ${isActive ? 'text-white' : 'group-hover:text-slate-200'}`}>{item.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.description}</p>
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-custom-blue" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-6 md:p-8 min-h-full shadow-2xl relative overflow-hidden group">
          {/* Decorative Gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-custom-blue/5 blur-[100px] pointer-events-none group-hover:bg-custom-blue/10 transition-all duration-700" />
          
          <div className="relative z-10">
            {activeTab === 'identity' && <LookFeelSettings />}
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'payroll' && <PayrollSettings />}
            {activeTab === 'shifts' && <ShiftSettings />}
            {activeTab === 'locations' && <LocationSettings />}
            {activeTab === 'crm' && <CRMSettings />}
            {activeTab === 'ai' && <AISettings />}
            {activeTab === 'automation' && <AutomationSettings />}
            {activeTab === 'mongodb' && <MongoSettings />}
            {activeTab === 'shopify' && <ShopifySettings />}
            {activeTab === 'danger' && <DangerZone />}
          </div>
        </div>
      </main>

    </div>
  );
}

// Needed imports for missing icons
import { Cpu } from 'lucide-react';
