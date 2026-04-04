import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { CheckSquare, Info, Plus, Minus, Settings as SettingsIcon, AlertCircle, ScanBarcode, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Assignment } from '../../types';
import QRScanner from '../../components/ui/QRScanner';

export default function WorkerTaskView() {
  const { session } = useAuth();
  const { assignments, products, addWorkLog, signalHelp } = useApp();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [piecesDone, setPiecesDone] = useState('');
  const [rejects, setRejects] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showSplash, setShowSplash] = useState<'success' | 'error' | null>(null);
  const [isSignalingHelp, setIsSignalingHelp] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const myAssignments = assignments.filter(a => 
    a.user_id === session.currentUser?.id && 
    (a.status !== 'completed' || a.date === today)
  ).sort((a, b) => {
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !piecesDone || !session.currentUser) return;

    const count = parseInt(piecesDone, 10);
    const rejCount = parseInt(rejects || '0', 10);
    if (count <= 0 && rejCount <= 0) return;

    try {
      addWorkLog({
        assignment_id: selectedAssignment.id,
        user_id: session.currentUser.id,
        date: today,
        pieces_ironed: selectedAssignment.task_type === 'Ironing' ? count : 0,
        pieces_checked: selectedAssignment.task_type === 'Checking' ? count : 0,
        pieces_labeled: selectedAssignment.task_type === 'Labeling' ? count : 0,
        pieces_packed: selectedAssignment.task_type === 'Packing' ? count : 0,
        pieces_rejected: rejCount,
        reject_reason: rejCount > 0 ? rejectReason : undefined,
      });

      setShowSplash(rejCount > 0 ? 'error' : 'success');
      setTimeout(() => setShowSplash(null), 2000);
      setSelectedAssignment(null);
      setPiecesDone('');
      setRejects('');
      setRejectReason('');
    } catch (err) {
      setShowSplash('error');
      setTimeout(() => setShowSplash(null), 3000);
    }
  };

  const handleSignalHelp = async () => {
    if (!selectedAssignment || !session.currentUser || isSignalingHelp) return;
    setIsSignalingHelp(true);
    await signalHelp(session.currentUser.id, selectedAssignment.id);
    setHelpSuccess(true);
    setTimeout(() => { setHelpSuccess(false); setIsSignalingHelp(false); }, 5000);
  };

  const handleScan = (scannedText: string) => {
    setScanError('');
    const product = products.find(p => p.sku === scannedText);
    const targetSku = product ? product.sku : scannedText;
    const match = myAssignments.find(a => a.sku === targetSku && a.status !== 'completed');
    if (match) { setSelectedAssignment(match); setIsScanning(false); }
    else { setIsScanning(false); setScanError(`No active task for: ${targetSku}`); setTimeout(() => setScanError(''), 4000); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Worker Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Hello {session.currentUser?.name?.split(' ')[0]}, here is your live task list.</p>
        </div>
        <button onClick={() => setIsScanning(true)} className="flex items-center justify-center px-6 py-2.5 bg-custom-blue text-white rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg shadow-custom-blue/20"><ScanBarcode className="w-5 h-5 mr-2" /> Scan SKU</button>
      </div>

      {scanError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-red-400 text-xs font-bold uppercase tracking-widest gap-2"><AlertCircle className="w-4 h-4" /> {scanError}</div>}
      {isScanning && <QRScanner onScan={handleScan} onClose={() => setIsScanning(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myAssignments.length === 0 && <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50"><CheckSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" /><h3 className="text-lg font-black text-white uppercase tracking-widest">No Active Tasks</h3><p className="text-xs text-slate-600 font-bold uppercase mt-2">All caught up! Check back later.</p></div>}
        {myAssignments.map(a => {
          const totalGoal = (a.pieces_assigned || 0) + (a.pieces_carried_forward || 0);
          const progress = Math.min(100, Math.round(((a.pieces_completed || 0) / totalGoal) * 100));
          return (
            <div key={a.id} className={`bg-slate-900 border rounded-3xl p-6 transition-all ${selectedAssignment?.id === a.id ? 'border-custom-blue ring-1 ring-custom-blue bg-custom-blue/5' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-2 flex-wrap"><span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{a.sku}</span><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{a.status}</span></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{a.task_type}</h3>
              </div>
              <div className="mb-8">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest mb-2"><span className="text-slate-500">Operation Progress</span><span className="text-white">{a.pieces_completed || 0} / {totalGoal}</span></div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-500 ${a.status === 'completed' ? 'bg-emerald-400' : 'bg-custom-blue'}`} style={{ width: `${progress}%` }} /></div>
              </div>
              {a.status !== 'completed' ? (
                <button onClick={() => setSelectedAssignment(a === selectedAssignment ? null : a)} className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-custom-blue text-white hover:bg-blue-600 shadow-xl shadow-blue-500/10">{selectedAssignment?.id === a.id ? 'Cancel Update' : 'Update pieces'}</button>
              ) : (
                <div className="w-full py-4 rounded-2xl text-center font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Finalized</div>
              )}
            </div>
          );
        })}
      </div>

      {selectedAssignment && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Log Progress</h2>
            <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-10">Operation: {selectedAssignment.task_type} ({selectedAssignment.sku})</p>
            <form onSubmit={handleLogWork} className="space-y-8">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setPiecesDone(prev => String(Math.max(0, parseInt(prev || '0', 10) - 1)))} className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-white active:scale-95 transition-all"><Minus className="w-6 h-6" /></button>
                <input type="number" min="0" required value={piecesDone} onChange={e => setPiecesDone(e.target.value)} placeholder="0" className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl py-6 text-center text-5xl font-black text-white outline-none focus:border-custom-blue shadow-inner" />
                <button type="button" onClick={() => setPiecesDone(prev => String(parseInt(prev || '0', 10) + 1))} className="w-20 h-20 rounded-3xl bg-custom-blue flex items-center justify-center text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all"><Plus className="w-8 h-8" /></button>
              </div>
              <div className="flex flex-col gap-3 pt-6">
                <div className="flex gap-3"><button type="button" onClick={() => setSelectedAssignment(null)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-white transition-all">Cancel</button><button type="submit" className="flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">Finalize Work</button></div>
                <button type="button" onClick={handleSignalHelp} disabled={isSignalingHelp} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${helpSuccess ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}><HelpCircle className="w-4 h-4" /> {helpSuccess ? 'Manager Notified' : 'Signal Help'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSplash && <div className={`fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-300 ${showSplash === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}><div className="text-center text-white">{showSplash === 'success' ? <><CheckCircle2 className="w-32 h-32 mx-auto mb-6 animate-bounce" /><h2 className="text-6xl font-black uppercase tracking-tighter">SUCCESS</h2><p className="text-xl font-bold opacity-80 mt-2 uppercase tracking-widest">Entry Stamped</p></> : <><AlertCircle className="w-32 h-32 mx-auto mb-6 animate-pulse" /><h2 className="text-6xl font-black uppercase tracking-tighter">ALERT</h2><p className="text-xl font-bold opacity-80 mt-2 uppercase tracking-widest">Rejected for Audit</p></>}</div></div>}
    </div>
  );
}
