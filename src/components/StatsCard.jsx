import { motion } from 'motion/react';

export default function StatsCard({ icon: Icon, label, value, subtitle, trend }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl hover:shadow-indigo-500/10 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="p-3 bg-indigo-500/10 rounded-2xl">
          <Icon className="text-indigo-400" size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{value}</h3>
        {subtitle && <p className="text-slate-600 text-xs mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
