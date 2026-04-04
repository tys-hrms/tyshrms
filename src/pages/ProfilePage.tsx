import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Building2, Shield, Calendar, Mail, FileText, Briefcase, Users, Phone } from 'lucide-react';

export default function ProfilePage() {
  const { session } = useAuth();
  const { currentUser, tenant } = session;

  if (!currentUser || !tenant) {
    return <div className="text-white p-8 animate-pulse text-center">Loading Profile Data...</div>;
  }

  const isAdmin = currentUser.role === 'Admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-16 h-16 rounded-2xl bg-custom-blue/10 border-2 border-custom-blue/20 flex items-center justify-center shadow-inner">
          <UserIcon className="w-8 h-8 text-custom-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{currentUser.name}</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{currentUser.role} Account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Universal Company ID Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Organization Identity</h2>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Your System Company ID</p>
            <div className="px-8 py-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-4xl text-emerald-400 font-black tracking-[0.2em] shadow-inner mb-4">
              {tenant.id}
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              This 6-digit ID uniquely binds your account to {tenant.name}. Share this carefully with new staff during registration.
            </p>
          </div>
        </div>

        {/* Admin Registration Details */}
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center gap-3">
              <Shield className="w-5 h-5 text-custom-blue" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Administrative Records</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                  <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Incorporation Name</p>
                    <p className="text-sm font-bold text-slate-200">{tenant.name} ({tenant.company_type})</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                  <UserIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Registered Administrator</p>
                    <p className="text-sm font-bold text-slate-200">{tenant.admin_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">DOB Registration</p>
                    <p className="text-sm font-bold text-slate-200">{tenant.dob}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Root Email</p>
                    <p className="text-sm font-bold text-slate-200">{tenant.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Root Phone</p>
                    <p className="text-sm font-bold text-slate-200">{tenant.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                     <Users className="w-4 h-4 text-custom-blue mb-2" />
                     <p className="text-xs font-bold text-slate-300">{tenant.employee_count}</p>
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Headcount</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                     <FileText className="w-4 h-4 text-custom-blue mb-2" />
                     <p className="text-xs font-bold text-slate-300">{tenant.gst || 'N/A'}</p>
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">GST ID</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
