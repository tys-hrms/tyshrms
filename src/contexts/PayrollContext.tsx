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
    if (!settings.mongodb.isEnabled || !session.tenant) return;
    db.request('find', 'salary_records', { filter: { tenantId: session.tenant.id } })
      .then(res => setSalaryRecords(res.documents || []));
  }, [settings.mongodb.isEnabled, session.tenant]);

  const getRecordsByMonth = (month: string) => {
    return salaryRecords.filter(r => r.month === month);
  };

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return (settings.payrollSettings?.weekends || [0]).includes(day);
  };

  const isHoliday = (dateStr: string) => {
    return (settings.payrollSettings?.holidayList || []).some(h => h.date === dateStr && !h.isWorking);
  };

  const processMonthlyPayroll = async (month: string) => {
    const workers = users.filter(u => u.role === 'Worker');
    const newRecords: SalaryRecord[] = [];
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    for (const worker of workers) {
      const userLogs = attendanceLogs.filter(l => l.userId === worker.id && l.date.startsWith(month));
      
      // Payable days calculation:
      // (Days Present) + (Weekend/Holiday credit if not explicitly absent)
      let payableDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const log = userLogs.find(l => l.date === dateStr);
        
        if (log?.status === 'present') {
           payableDays += 1;
        } else if (log?.status === 'half_day') {
           payableDays += 0.5;
        } else if (!log || log.status === 'holiday') {
           // If it's a weekend or a holiday and no 'absent' mark exists, it's paid
           if (isWeekend(dateStr) || isHoliday(dateStr)) {
             payableDays += 1;
           }
        }
      }

      const dailyRate = worker.salaryStructure?.basic 
        ? (worker.salaryStructure.basic / 26) 
        : (worker.salaryDetails?.basicSalary ? (worker.salaryDetails.basicSalary / 26) : 500);
        
      const grossPay = payableDays * dailyRate;
      
      // Statutory Calculations
      const epf = settings.payrollSettings?.epfEnabled && (worker.salaryStructure?.isEpfMember ?? true) 
        ? Math.round(grossPay * 0.12) : 0;
      const esi = settings.payrollSettings?.esiEnabled && (worker.salaryStructure?.isEsiMember ?? true)
        ? Math.round(grossPay * 0.0075) : 0; 
      
      // Professional Tax (simplified for demo, usually state-specific)
      const pt = settings.payrollSettings?.ptEnabled && grossPay > 10000 ? 200 : 0;

      const record: SalaryRecord = {
        id: crypto.randomUUID(),
        tenantId: session.tenant?.id || 'default',
        userId: worker.id,
        month,
        workingDays: payableDays,
        grossPay: Math.round(grossPay),
        epfDeduction: epf,
        esiDeduction: esi,
        ptDeduction: pt,
        otherDeductions: 0,
        netPay: Math.round(grossPay - epf - esi - pt),
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      newRecords.push(record);
    }

    if (settings.mongodb.isEnabled) {
      await db.saveMany('salary_records', newRecords);
    }

    setSalaryRecords(prev => [...prev, ...newRecords]);
  };

  const updateSalaryRecord = async (id: string, updates: Partial<SalaryRecord>) => {
    const record = salaryRecords.find(r => r.id === id);
    if (!record) return;
    const updatedRecord = { ...record, ...updates };
    if (settings.mongodb.isEnabled) {
      await db.save('salary_records', updatedRecord);
    }
    setSalaryRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
  };

  const exportToCSV = (month: string) => {
    const records = getRecordsByMonth(month);
    const headers = ['Employee Name', 'Month', 'Working Days', 'Gross Pay', 'EPF', 'ESI', 'PT', 'Net Pay'];
    const rows = records.map(r => {
      const user = users.find(u => u.id === r.userId);
      return [
        user?.name || 'Unknown',
        r.month,
        r.workingDays,
        r.grossPay,
        r.epfDeduction,
        r.esiDeduction,
        r.ptDeduction,
        r.netPay
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
