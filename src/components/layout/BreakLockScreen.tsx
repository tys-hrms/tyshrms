import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Coffee, Play, Lock } from 'lucide-react';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BreakLockScreen({ onEndBreak }: { onEndBreak: () => void }) {
  const { session, endBreak } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (session.break_start_time) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - session.break_start_time!);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [session.break_start_time]);

  const handleEndBreak = () => {
    endBreak();
    onEndBreak();
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
          <Coffee className="w-12 h-12 text-amber-400" />
        </div>

        {/* Timer */}
        <div className="text-center">
          <p className="text-surface-400 text-sm font-medium mb-2">Break Time</p>
          <p className="text-6xl font-bold text-white tabular-nums tracking-tight">
            {formatDuration(elapsed)}
          </p>
        </div>

        {/* Lock icon */}
        <div className="flex items-center gap-2 text-surface-500">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Screen locked during break</span>
        </div>

        {/* End break button */}
        <button
          onClick={handleEndBreak}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                     text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/30
                     transition-all duration-200 active:scale-95"
        >
          <Play className="w-5 h-5" />
          End Break & Resume
        </button>
      </div>
    </div>
  );
}
