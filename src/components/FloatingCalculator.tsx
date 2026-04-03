import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Equal, Delete } from 'lucide-react';

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ x: 32, y: window.innerHeight - 450 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const calcRef = useRef<HTMLDivElement>(null);

  // Toggle with Ctrl+Shift+C
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Listen to keystrokes specifically for the calculator when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeypress = (e: KeyboardEvent) => {
      // Prevent mapping if they are typing in an input field somewhere else
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
         if ((e.target as HTMLElement).id !== 'calc-input') return;
      }

      const key = e.key;
      if (/[0-9+\-*/.%]/.test(key)) {
        append(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
      } else if (key === 'Backspace') {
        setExpression(prev => prev.slice(0, -1));
      } else if (key === 'Escape') {
        setIsOpen(false);
      } else if (key.toLowerCase() === 'c') {
        clear();
      }
    };

    window.addEventListener('keydown', handleKeypress);
    return () => window.removeEventListener('keydown', handleKeypress);
  }, [isOpen, expression]);

  const append = (c: string) => setExpression(prev => prev + c);
  const clear = () => { setExpression(''); setResult(''); };
  
  const calculate = () => {
    try {
      if (!expression) return;
      // Secure strict calculation logic mapping
      const sanitized = expression.replace(/[^0-9+\-*/.%()]/g, '').replace(/%/g, '/100');
      const calcResult = new Function('return ' + sanitized)();
      if (!isFinite(calcResult) || isNaN(calcResult)) throw new Error('Invalid');
      setResult(String(Math.round(calcResult * 10000000) / 10000000));
    } catch {
      setResult('Error');
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      if (!calcRef.current) return;
      setIsDragging(true);
      const rect = calcRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
      });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-custom-blue rounded-2xl flex items-center justify-center text-slate-300 shadow-xl transition-all active:scale-95 group"
        title="Calculator (Ctrl+Shift+C)"
      >
        <Calculator className="w-5 h-5 group-hover:text-custom-blue transition-colors" />
      </button>

      {isOpen && (
        <div 
          ref={calcRef}
          style={{ left: pos.x, top: pos.y }}
          className="fixed z-[100] w-64 bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] touch-none select-none flex flex-col"
        >
          {/* Header Drag Handle */}
          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-3 cursor-move"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-custom-blue" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calc</span>
            </div>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Display */}
          <div className="p-4 border-b border-slate-800 bg-slate-900 shadow-inner text-right min-h-[90px] flex flex-col justify-end">
             <div className="text-xs text-slate-500 tracking-wider font-mono h-4 overflow-hidden text-ellipsis whitespace-nowrap mb-1">
               {expression}
             </div>
             <div className="text-3xl font-black text-white tracking-tighter overflow-hidden text-ellipsis whitespace-nowrap">
               {result || expression || '0'}
             </div>
          </div>

          {/* Keypad */}
          <div className="p-2 bg-slate-950 grid grid-cols-4 gap-2">
             {['C', '(', ')', '/'].map(btn => (
               <button key={btn} onClick={btn === 'C' ? clear : () => append(btn)} className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-custom-blue rounded-xl transition-colors">{btn}</button>
             ))}
             {['7', '8', '9', '*'].map(btn => (
               <button key={btn} onClick={() => append(btn)} className={`p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors ${['*'].includes(btn) ? 'text-custom-blue' : 'text-slate-200'}`}>{btn}</button>
             ))}
             {['4', '5', '6', '-'].map(btn => (
               <button key={btn} onClick={() => append(btn)} className={`p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors ${['-'].includes(btn) ? 'text-custom-blue' : 'text-slate-200'}`}>{btn}</button>
             ))}
             {['1', '2', '3', '+'].map(btn => (
               <button key={btn} onClick={() => append(btn)} className={`p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors ${['+'].includes(btn) ? 'text-custom-blue' : 'text-slate-200'}`}>{btn}</button>
             ))}
             <button onClick={() => setExpression(prev => prev.slice(0, -1))} className="p-3 flex items-center justify-center text-sm font-bold bg-slate-900 hover:bg-slate-800 text-rose-400 rounded-xl transition-colors">
               <Delete className="w-4 h-4" />
             </button>
             <button onClick={() => append('0')} className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl transition-colors">0</button>
             <button onClick={() => append('.')} className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl transition-colors">.</button>
             <button onClick={() => append('%')} className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl transition-colors">%</button>
             <button onClick={calculate} className="p-3 flex items-center justify-center text-sm font-bold bg-custom-blue hover:bg-blue-600 text-white rounded-xl shadow-lg transition-colors col-span-4 mt-2">
               <Equal className="w-4 h-4 mr-2" /> Calculate
             </button>
          </div>
        </div>
      )}
    </>
  );
}
