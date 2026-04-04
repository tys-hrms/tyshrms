import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { SalaryRecord } from '../types';
import { db } from '../lib/database';

interface PayrollContextType {
  salaryRecords: SalaryRecord[];
  processMonthlyPayroll: (month: string) => Promise<void>;
  updateSalaryRecord: (id: string, updates: Partial<SalaryRecord>) => Promise<void>;
  getRecordsByMonth: (month: string) => SalaryRecord[];
  exportToCSV: (month: string) => void;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const { users, attendanceLogs, session } = useAuth();
  const { settings } = useSettings();
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  useEffect(() => {
    if (!session.tenant?.id) return;
    db.request('find', 'salary_records', { filter: { tenant_id: session.tenant.id } })
      .then(res => setSalaryRecords(res.documents || []));
  }, [session.tenant?.id]);

  const getRecordsByMonth = (month: string) => {
    return salaryRecords.filter(r => r.month === month);
  };

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return (settings.payroll_settings?.weekends || [0]).includes(day);
  };

  const isHoliday = (dateStr: string) => {
    return (settings.payroll_settings?.holiday_list || []).some((h: { date: string; isWorking: boolean }) => h.date === dateStr && !h.isWorking);
  };

  const processMonthlyPayroll = async (month: string) => {
    const ps = settings.payroll_settings;
    const workers = users.filter(u => u.role === 'Worker');
    const newRecords: SalaryRecord[] = [];
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    for (const worker of workers) {
      const userLogs = attendanceLogs.filter(l => l.user_id === worker.id && l.date.startsWith(month));
      
      let payableDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const log = userLogs.find(l => l.date === dateStr);
        
        if (log?.status === 'present') {
           payableDays += 1;
        } else if (log?.status === 'half_day') {
           payableDays += 0.5;
        } else if (!log || log.status === 'holiday') {
           if (isWeekend(dateStr) || isHoliday(dateStr)) {
             payableDays += 1;
           }
        }
      }

      const dailyRate = worker.salary_structure?.basic 
        ? (worker.salary_structure.basic / 26) 
        : 500;
        
      const grossPay = payableDays * dailyRate;
      
      const epf = ps?.epf_enabled && (worker.salary_structure?.is_epf_member ?? true) 
        ? Math.round(grossPay * ((ps?.epf_rate || 12) / 100)) : 0;
      const esi = ps?.esi_enabled && (worker.salary_structure?.is_esi_member ?? true)
        ? Math.round(grossPay * ((ps?.esi_rate || 0.75) / 100)) : 0; 
      
      const pt = ps?.pt_enabled && grossPay > (ps?.pt_threshold || 10000) ? (ps?.pt_amount || 200) : 0;

      const record: SalaryRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        tenant_id: session.tenant?.id || 'default',
        user_id: worker.id,
        month,
        working_days: payableDays,
        gross_pay: Math.round(grossPay),
        epf_deduction: epf,
        esi_deduction: esi,
        pt_deduction: pt,
        net_pay: Math.round(grossPay - epf - esi - pt),
        status: 'pending',
        created_at: new Date().toISOString()
      } as SalaryRecord;

      newRecords.push(record);
    }

    if (session.tenant?.id) {
      await db.saveMany('salary_records', newRecords);
    }

    setSalaryRecords(prev => [...prev, ...newRecords]);
  };

  const updateSalaryRecord = async (id: string, updates: Partial<SalaryRecord>) => {
    const record = salaryRecords.find(r => r.id === id);
    if (!record) return;
    const updatedRecord = { ...record, ...updates };
    if (session.tenant?.id) {
      await db.save('salary_records', updatedRecord);
    }
    setSalaryRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
  };

  const exportToCSV = (month: string) => {
    const records = getRecordsByMonth(month);
    const headers = ['Employee Name', 'Month', 'Working Days', 'Gross Pay', 'EPF', 'ESI', 'PT', 'Net Pay'];
    const rows = records.map(r => {
      const user = users.find(u => u.id === r.user_id);
      return [
        user?.name || 'Unknown',
        r.month,
        r.working_days,
        r.gross_pay,
        r.epf_deduction,
        r.esi_deduction,
        r.pt_deduction,
        r.net_pay
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PayrollContext.Provider value={{ 
      salaryRecords, processMonthlyPayroll, updateSalaryRecord, 
      getRecordsByMonth, exportToCSV 
    }}>
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  const context = useContext(PayrollContext);
  if (!context) throw new Error('usePayroll must be used within PayrollProvider');
  return context;
}
