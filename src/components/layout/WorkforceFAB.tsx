import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LogIn, LogOut, Coffee, Play, Timer, X, Clock
} from 'lucide-react';

interface WorkforceFABProps {
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkforceFAB({ onBreakStart, onBreakEnd }: WorkforceFABProps) {
  const { session, clockIn, clockOut, startBreak, endBreak } = useAuth();
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (session.isOnBreak && session.breakStartTime) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - session.breakStartTime!);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [session.isOnBreak, session.breakStartTime]);

  const handleClockIn = () => {
    clockIn();
    setOpen(false);
  };

  const handleClockOut = () => {
    clockOut();
    setOpen(false);
  };

  const handleStartBreak = () => {
    startBreak();
    onBreakStart?.();
    setOpen(false);
  };

  const handleEndBreak = () => {
    endBreak();
    onBreakEnd?.();
    setOpen(false);
  };

  return (
    <>
      {/* Break timer pill */}
      {session.isOnBreak && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="bg-amber-500 text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-amber-500/30">
            <Coffee className="w-4 h-4" />
            <span className="text-sm font-semibold">On Break · {formatDuration(elapsed)}</span>
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        {/* Action buttons */}
        {open && (
          <div className="flex flex-col items-end gap-2 animate-slide-up">
            {!session.isClockedIn ? (
              <FabAction
                icon={<LogIn className="w-5 h-5" />}
                label="Clock In"
                color="bg-emerald-500"
                onClick={handleClockIn}
              />
            ) : (
              <>
                {!session.isOnBreak ? (
                  <FabAction
                    icon={<Coffee className="w-5 h-5" />}
                    label="Start Break"
                    color="bg-amber-500"
                    onClick={handleStartBreak}
                  />
                ) : (
                  <FabAction
                    icon={<Play className="w-5 h-5" />}
                    label="End Break"
                    color="bg-emerald-500"
                    onClick={handleEndBreak}
                  />
                )}
                <FabAction
                  icon={<LogOut className="w-5 h-5" />}
                  label="Clock Out"
                  color="bg-red-500"
                  onClick={handleClockOut}
                />
              </>
            )}
          </div>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-90
            ${open ? 'bg-surface-600 rotate-45' : session.isOnBreak
              ? 'bg-amber-500 shadow-amber-500/40 animate-pulse-slow'
              : session.isClockedIn
                ? 'bg-emerald-500 shadow-emerald-500/40'
                : 'bg-brand-500 shadow-brand-500/40'}`}
        >
          {open
            ? <X className="w-6 h-6 text-white" />
            : session.isOnBreak
              ? <Timer className="w-6 h-6 text-white" />
              : <Clock className="w-6 h-6 text-white" />}
        </button>
      </div>

      {/* Click-outside backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FabAction({
  icon, label, color, onClick
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 pr-4 pl-3 py-2.5 rounded-full text-white font-semibold text-sm
                 shadow-lg active:scale-95 transition-all duration-150"
      style={{ background: color.replace('bg-', '') }}
    >
      <span className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
        {icon}
      </span>
      {label}
    </button>
  );
}
