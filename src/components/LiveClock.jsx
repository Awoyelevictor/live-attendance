import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function LiveClock({ variant = 'compact', className = '' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-200 shadow-inner ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Clock size={14} className="text-indigo-400 shrink-0" />
        <span className="font-bold text-white tracking-wider">{formattedTime}</span>
        <span className="text-slate-500 hidden md:inline">|</span>
        <span className="text-slate-400 hidden md:inline text-[11px]">{formattedDate}</span>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Clock size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-white">{formattedTime}</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
        </div>
      </div>
      <div className="text-right text-[11px] text-slate-500 font-semibold uppercase tracking-wider hidden sm:block">
        System Local Time
      </div>
    </div>
  );
}
