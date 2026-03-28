import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { CheckSquare, Info, Plus, Minus, Calendar, Settings as SettingsIcon, AlertCircle, ScanBarcode, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Assignment } from '../../types';
import QRScanner from '../../components/ui/QRScanner';

export default function WorkerTaskView() {
  const { session } = useAuth();
  const { assignments, products, addWorkLog } = useApp();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [piecesDone, setPiecesDone] = useState('');
  const [rejects, setRejects] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  
  // New Market-Ready UI states
  const [showSplash, setShowSplash] = useState<'success' | 'error' | null>(null);
  const [isSignalingHelp, setIsSignalingHelp] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState(false);
  const { signalHelp } = useApp();

  const today = new Date().toISOString().split('T')[0];

  // Get active assignments for this worker (pending ones, or ones completed today)
  const myAssignments = assignments.filter(a => 
    a.userId === session.currentUser?.id && 
    (a.status !== 'completed' || a.date === today)
  ).sort((a, b) => {
    // Show pending first
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !piecesDone || !session.currentUser) return;

    const count = parseInt(piecesDone, 10);
    const rejCount = parseInt(rejects || '0', 10);
    if (count <= 0 && rejCount <= 0) return;

    try {
      addWorkLog({
        assignmentId: selectedAssignment.id,
        userId: session.currentUser.id,
        date: today,
        piecesIroned: selectedAssignment.taskType === 'Ironing' ? count : 0,
        piecesChecked: selectedAssignment.taskType === 'Checking' ? count : 0,
        piecesLabeled: selectedAssignment.taskType === 'Labeling' ? count : 0,
        piecesPacked: selectedAssignment.taskType === 'Packing' ? count : 0,
        piecesRejected: rejCount,
        rejectReason: rejCount > 0 ? rejectReason : undefined,
      });

      // Show Success Splash
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
    
    setTimeout(() => {
      setHelpSuccess(false);
      setIsSignalingHelp(false);
    }, 5000);
  };

  const handleScan = (scannedText: string) => {
    setScanError('');
    const product = products.find(p => p.barcode === scannedText || p.sku === scannedText);
    const targetSku = product ? product.sku : scannedText;

    const match = myAssignments.find(a => a.sku === targetSku && a.status !== 'completed');

    if (match) {
       setSelectedAssignment(match);
       setIsScanning(false);
    } else {
       setIsScanning(false);
       setScanError(`No active task found for: ${targetSku}`);
       setTimeout(() => setScanError(''), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Hello {session.currentUser?.name?.split(' ')[0]}, here are your assigned tasks.</p>
        </div>
        <button
          onClick={() => setIsScanning(true)}
          className="flex items-center justify-center px-6 py-2.5 bg-custom-blue text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap shadow-lg shadow-custom-blue/20"
        >
          <ScanBarcode className="w-5 h-5 mr-2" />
          Scan Barcode
        </button>
      </div>

      {scanError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          {scanError}
        </div>
      )}

      {isScanning && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {myAssignments.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Active Tasks</h3>
            <p className="text-slate-400">You're all caught up! Enjoy your day.</p>
          </div>
        )}

        {myAssignments.map(a => {
          const totalGoal = a.piecesAssigned + a.piecesCarriedForward;
          const progress = Math.min(100, Math.round((a.piecesCompleted / totalGoal) * 100));
          const isPending = a.status !== 'completed';

          return (
            <div 
              key={a.id} 
              className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
                selectedAssignment?.id === a.id 
                  ? 'border-custom-blue shadow-lg shadow-custom-blue/10 scale-[1.02]' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">{a.sku}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${a.mode === 'jodi' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>{a.mode}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{a.taskType}</h3>
                </div>
              </div>

              {a.piecesCarriedForward > 0 && (
                <div className="mb-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 mr-2 shrink-0" />
                  <div className="text-sm text-orange-200">
                    <span className="font-semibold block text-orange-300">Carried Forward</span>
                    {a.piecesCarriedForward} pieces carried over from previous days.
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-bold text-white tracking-wide">
                    {a.piecesCompleted} / {totalGoal}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isPending ? 'bg-custom-blue' : 'bg-teal-400'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {isPending && (
                <button
                  onClick={() => setSelectedAssignment(a === selectedAssignment ? null : a)}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    selectedAssignment?.id === a.id
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'bg-custom-blue text-white hover:bg-blue-600'
                  }`}
                >
                  {selectedAssignment?.id === a.id ? 'Cancel Update' : 'Update Progress'}
                </button>
              )}
              {!isPending && (
                <div className="w-full py-2.5 rounded-xl text-center font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 text-sm flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Task Completed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update Form Modal-Overlay inside container */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Update Progress</h2>
            <p className="text-sm text-slate-400 mb-6">
              Logging pieces for <strong>{selectedAssignment.taskType}</strong> ({selectedAssignment.sku})
            </p>

            <form onSubmit={handleLogWork} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-4">Pieces Completed (Tap to Increment)</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPiecesDone(prev => String(Math.max(0, parseInt(prev || '0', 10) - 1)))}
                    className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      required
                      value={piecesDone}
                      onChange={e => setPiecesDone(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-center text-3xl font-black text-white outline-none focus:border-custom-blue"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPiecesDone(prev => String(parseInt(prev || '0', 10) + 1))}
                    className="w-20 h-20 rounded-2xl bg-custom-blue flex items-center justify-center text-white shadow-lg shadow-custom-blue/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                <label className="block text-sm font-medium text-slate-300 mb-2">Pieces Rejected / Defects</label>
                <input
                  type="number"
                  min="0"
                  value={rejects}
                  onChange={e => setRejects(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-3"
                />
                
                {parseInt(rejects || '0', 10) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Reason for Defect</label>
                    <select
                      required
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">Select reason...</option>
                      <option value="Damaged Material">Damaged Material</option>
                      <option value="Stitching Defect">Stitching Defect</option>
                      <option value="Measurements Off">Measurements Off</option>
                      <option value="Dirty/Stained">Dirty/Stained</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedAssignment(null); setPiecesDone(''); setRejects(''); setRejectReason(''); }}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 rounded-2xl font-black text-lg text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Submit Work
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleSignalHelp}
                  disabled={isSignalingHelp}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    helpSuccess 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                      : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20'
                  }`}
                >
                  <HelpCircle className={`w-4 h-4 ${isSignalingHelp && !helpSuccess ? 'animate-spin' : ''}`} />
                  {helpSuccess ? 'Manager Notified' : isSignalingHelp ? 'Sending Signal...' : 'Signal for Help / Blockage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Status Splashes */}
      {showSplash && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-300 ${
          showSplash === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          <div className="text-center text-white">
            {showSplash === 'success' ? (
              <>
                <CheckCircle2 className="w-32 h-32 mx-auto mb-6 animate-bounce" />
                <h2 className="text-5xl font-black uppercase tracking-tighter">Great Job!</h2>
                <p className="text-xl font-bold opacity-80 mt-2">Work logged successfully</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-32 h-32 mx-auto mb-6 animate-pulse" />
                <h2 className="text-5xl font-black uppercase tracking-tighter">Rejected Items</h2>
                <p className="text-xl font-bold opacity-80 mt-2">Quality alert sent to supervisor</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
