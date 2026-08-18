import { clsx } from 'clsx';

export default function StatusBadge({ status }) {
  const styles = {
    present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    late: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    absent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    Active: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    Suspended: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span className={clsx(
      "px-3 py-1 rounded-full text-xs font-bold border capitalize",
      styles[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
    )}>
      {status}
    </span>
  );
}
