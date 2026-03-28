import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Calendar, Search, Clock, MapPin, Coffee, CheckCircle2 } from 'lucide-react';

export default function AttendancePage() {
  const { session, users, attendanceLogs, breakLogs } = useAuth();
  const { shifts } = useSettings();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = session.currentUser?.role === 'Admin' || session.currentUser?.role === 'Manager';
  const displayUsers = isAdmin ? users : users.filter(u => u.id === session.currentUser?.id);

  const getShiftForUser = (shiftId?: string) => shifts.find(s => s.id === shiftId)?.name || 'Open Shift';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Daily Attendance</h1>
          <p className="text-slate-400 text-sm mt-1">Review clock-ins, breaks, and working hours.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white w-full sm:w-48 focus:border-custom-blue outline-none hidden md:block"
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-custom-blue outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Clock In</th>
                <th className="px-6 py-4">Clock Out</th>
                <th className="px-6 py-4">Status & Breaks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayUsers
                .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((user) => {
                  const record = attendanceLogs.find(l => l.userId === user.id && l.date === date);
                  const userBreaks = record ? breakLogs.filter(b => b.attendanceLogId === record.id) : [];

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-medium shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">{user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {getShiftForUser(user.shiftId)}
                      </td>
                      <td className="px-6 py-4">
                        {record?.clockIn ? (
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium mb-1">
                              {new Date(record.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              {record.method === 'geofence' ? (
                                <><MapPin className="w-3 h-3 mr-1 text-teal-400" /> Geofence</>
                              ) : (
                                <><CheckCircle2 className="w-3 h-3 mr-1 text-blue-400" /> Manual</>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record?.clockOut ? (
                          <span className="text-sm text-white font-medium">
                            {new Date(record.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        ) : record?.clockIn ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active Now
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500 font-medium">—</span>
                        )}
                      </td>
                    <td className="px-6 py-4">
                        {!record ? (
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent</span>
                        ) : (
                          <div className="flex gap-2 text-xs">
                            {userBreaks && userBreaks.length > 0 ? (
                              userBreaks.map((b, i) => (
                                <div key={i} className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                                  <Coffee className="w-3 h-3 mr-1.5" />
                                  {new Date(b.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                  {b.endTime ? new Date(b.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ' Now'}
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-500">No breaks taken</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {displayUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
