import { useState, useEffect } from 'react';
import { Flame, Trophy, Award, Zap, ChevronUp, Star, Shield, ArrowUpRight, Search, Sparkles, Target, HelpCircle, Check, Info, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';

const TIER_DESCRIPTIONS = [
  {
    rank: 'Phoenix Champion',
    streak: '30+ Days',
    multiplier: '3.0x XP',
    badge: 'from-amber-400 via-rose-500 to-purple-600',
    iconColor: 'text-amber-300',
    description: 'The ultimate hall-of-fame attendance legend. Unlocks maximum XP multiplier & legendary prestige badge.'
  },
  {
    rank: 'Inferno Master',
    streak: '14–29 Days',
    multiplier: '2.0x XP',
    badge: 'from-rose-600 via-orange-500 to-amber-400',
    iconColor: 'text-rose-400',
    description: 'Two full weeks of punctual mastery. Top tier competitor status.'
  },
  {
    rank: 'Blaze Veteran',
    streak: '7–13 Days',
    multiplier: '1.5x XP',
    badge: 'from-orange-500 to-amber-500',
    iconColor: 'text-orange-400',
    description: 'One solid week without a single late arrival. 1.5x bonus points.'
  },
  {
    rank: 'Flame Rising',
    streak: '3–6 Days',
    multiplier: '1.25x XP',
    badge: 'from-amber-500 to-yellow-500',
    iconColor: 'text-amber-400',
    description: 'Consistent early bird habit in progress. 1.25x bonus points.'
  },
  {
    rank: 'Spark Starter',
    streak: '1–2 Days',
    multiplier: '1.0x XP',
    badge: 'from-yellow-400 to-amber-500',
    iconColor: 'text-yellow-400',
    description: 'Punctuality fire sparked! Keep showing up on time to level up.'
  }
];

export default function TraineeLeaderboard({ currentUserId, onRefresh }) {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [showTierGuide, setShowTierGuide] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/worker/leaderboard');
      setLeaderboardData(data);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const leaderboard = leaderboardData?.leaderboard || [];
  const myStats = leaderboardData?.myStats || null;

  const departments = ['all', ...new Set(leaderboard.map(u => u.department).filter(Boolean))];

  const filteredLeaderboard = leaderboard.filter(u => {
    const matchesSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'all' || u.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Tier Perks Modal */}
      <AnimatePresence>
        {showTierGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowTierGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <Flame size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Fire Streak & Early Bird Tiers</h3>
                    <p className="text-xs text-slate-400">Rules & multiplier rewards for early check-in competition</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTierGuide(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800"
                >
                  Close
                </button>
              </div>

              {/* Scoring Rules */}
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> How To Earn Points & Maintain Your Streak:
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li><strong className="text-white">Super Early (15+ min early):</strong> +100 Base XP × Tier Multiplier</li>
                  <li><strong className="text-white">Early Bird (5–14 min early):</strong> +75 Base XP × Tier Multiplier</li>
                  <li><strong className="text-white">On-Time (0–4 min early):</strong> +50 Base XP × Tier Multiplier</li>
                  <li><strong className="text-rose-400">Late Arrival:</strong> Streak breaks back to 0 & multiplier resets.</li>
                </ul>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {TIER_DESCRIPTIONS.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/20 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tier.badge} flex items-center justify-center text-white shadow-md shrink-0`}>
                        <Flame size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{tier.rank}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {tier.streak}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{tier.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-black text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        {tier.multiplier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTierGuide(false)}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Flame size={15} />
                <span>Got It, Let's Compete!</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Leaderboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
              <Trophy size={20} />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Trainee Punctuality Leaderboard</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time standings ranked by consecutive on-time fire streaks and Early Bird XP
          </p>
        </div>

        <button
          onClick={() => setShowTierGuide(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 px-3 py-1.5 rounded-xl transition-all"
        >
          <HelpCircle size={14} />
          Tier Perks & Multipliers
        </button>
      </div>

      {/* Podium Top 3 Standings */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`order-2 md:order-1 relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border p-5 rounded-3xl flex flex-col items-center text-center shadow-lg transition-all ${
                String(top3[1]._id) === String(currentUserId) 
                  ? 'border-indigo-500/60 shadow-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-slate-900/80' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-black text-slate-300">
                #2 Silver
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-400/40 overflow-hidden shadow-inner flex items-center justify-center text-white font-bold text-lg">
                  {top3[1].avatar ? (
                    <img src={top3[1].avatar} alt={top3[1].name} className="w-full h-full object-cover" />
                  ) : (
                    top3[1].name[0]
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-slate-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                  2
                </div>
              </div>

              <h4 className="text-sm font-bold text-white truncate max-w-[180px]">
                {top3[1].name} {String(top3[1]._id) === String(currentUserId) && '(You)'}
              </h4>
              <p className="text-[11px] text-slate-400">{top3[1].department || 'General'}</p>

              <div className="mt-3 flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                  <Flame size={14} className="text-orange-400" />
                  {top3[1].punctualityStreak} Days
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  {top3[1].earlyBirdPoints} XP
                </span>
              </div>
            </motion.div>
          )}

          {/* 1st Place (Champion) */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`order-1 md:order-2 relative overflow-hidden bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900/90 backdrop-blur-xl border p-6 rounded-3xl flex flex-col items-center text-center shadow-xl border-amber-500/40 shadow-amber-500/10 ${
                String(top3[0]._id) === String(currentUserId) ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 animate-pulse">
                <Crown size={12} className="text-amber-400" />
                <span>#1 Champion</span>
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 overflow-hidden shadow-lg shadow-amber-500/20 flex items-center justify-center text-white font-bold text-xl">
                  {top3[0].avatar ? (
                    <img src={top3[0].avatar} alt={top3[0].name} className="w-full h-full object-cover" />
                  ) : (
                    top3[0].name[0]
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg">
                  1
                </div>
              </div>

              <h4 className="text-base font-bold text-white truncate max-w-[200px]">
                {top3[0].name} {String(top3[0]._id) === String(currentUserId) && '(You)'}
              </h4>
              <p className="text-xs text-amber-300/80 font-medium">{top3[0].department || 'General'}</p>

              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-black">
                  <Flame size={16} className="text-orange-400 animate-bounce" />
                  {top3[0].punctualityStreak} Day Streak
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                  {top3[0].earlyBirdPoints} XP
                </span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`order-3 relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border p-5 rounded-3xl flex flex-col items-center text-center shadow-lg transition-all ${
                String(top3[2]._id) === String(currentUserId) 
                  ? 'border-indigo-500/60 shadow-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-slate-900/80' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-black text-amber-600">
                #3 Bronze
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-amber-700/40 overflow-hidden shadow-inner flex items-center justify-center text-white font-bold text-lg">
                  {top3[2].avatar ? (
                    <img src={top3[2].avatar} alt={top3[2].name} className="w-full h-full object-cover" />
                  ) : (
                    top3[2].name[0]
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                  3
                </div>
              </div>

              <h4 className="text-sm font-bold text-white truncate max-w-[180px]">
                {top3[2].name} {String(top3[2]._id) === String(currentUserId) && '(You)'}
              </h4>
              <p className="text-[11px] text-slate-400">{top3[2].department || 'General'}</p>

              <div className="mt-3 flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                  <Flame size={14} className="text-orange-400" />
                  {top3[2].punctualityStreak} Days
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  {top3[2].earlyBirdPoints} XP
                </span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Your Rank Status Bar (if in list) */}
      {myStats && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-5 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 font-black text-lg flex items-center justify-center shrink-0">
              #{myStats.rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Your Current Standing</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                  Top {myStats.percentile}%
                </span>
              </div>
              <p className="text-sm text-slate-200 mt-0.5">
                You are on a <strong className="text-orange-400">{myStats.punctualityStreak}-day fire streak</strong> with <strong className="text-amber-400">{myStats.earlyBirdPoints} Early Bird XP</strong>.
              </p>
            </div>
          </div>

          {myStats.aheadOfYou && (
            <div className="text-xs text-slate-400 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400 shrink-0" />
              <span>
                Earn <strong className="text-yellow-300">{Math.max(10, myStats.aheadOfYou.earlyBirdPoints - myStats.earlyBirdPoints + 25)} XP</strong> more to overtake <strong className="text-white">{myStats.aheadOfYou.name}</strong> for #{myStats.rank - 1}!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Filter & Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search trainees or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterDept === dept
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {dept === 'all' ? 'All Departments' : dept}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Trainee / Employee</th>
                <th className="py-3 px-4">Fire Streak</th>
                <th className="py-3 px-4">Best Streak</th>
                <th className="py-3 px-4">Early Bird XP</th>
                <th className="py-3 px-4">On-Time %</th>
                <th className="py-3 px-4">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {filteredLeaderboard.map(item => {
                const isMe = String(item._id) === String(currentUserId);
                return (
                  <tr
                    key={item._id}
                    className={`transition-colors ${
                      isMe 
                        ? 'bg-indigo-600/10 font-medium' 
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold">
                      {item.rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                          1
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-black text-xs">
                          2
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold pl-1.5">#{item.rank}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            item.name[0]
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold">{item.name}</span>
                            {isMe && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{item.department} • {item.employeeId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        item.punctualityStreak >= 7
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : item.punctualityStreak >= 3
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : item.punctualityStreak >= 1
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'text-slate-500'
                      }`}>
                        <Flame size={13} className={item.punctualityStreak > 0 ? 'text-orange-400' : 'text-slate-600'} />
                        {item.punctualityStreak} {item.punctualityStreak === 1 ? 'day' : 'days'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-medium">
                      {item.bestStreak} days
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {item.earlyBirdPoints} XP
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${item.onTimeRate}%` }}
                          />
                        </div>
                        <span className="text-slate-300 font-semibold text-[11px]">{item.onTimeRate}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.streakTier?.borderColor || 'border-slate-700'
                      } ${item.streakTier?.bgColor || 'bg-slate-800'} ${item.streakTier?.textColor || 'text-slate-400'}`}>
                        {item.streakTier?.title || 'Spark'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredLeaderboard.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No matching trainees found in leaderboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
