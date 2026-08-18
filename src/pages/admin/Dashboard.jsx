import { useState, useEffect } from 'react';
import { 
  Users, Clock, AlertTriangle, TrendingUp, Calendar, CheckCircle2, 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  RefreshCw, Award, Building2, Filter
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import LiveClock from '../../components/LiveClock';
import api from '../../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [togglingSystem, setTogglingSystem] = useState(false);
  
  // Interactive view states
  const [timeframe, setTimeframe] = useState('14'); // '7', '14', 'all'
  const [chartType, setChartType] = useState('stacked'); // 'stacked', 'grouped', 'area'

  const fetchSystemStatus = async () => {
    try {
      const { data } = await api.get('/admin/settings');
      setIsSystemActive(data.isSystemActive);
    } catch (error) {
      console.error('Failed to fetch system status', error);
    }
  };

  const toggleSystemStatus = async () => {
    setTogglingSystem(true);
    try {
      const newStatus = !isSystemActive;
      const { data } = await api.post('/admin/settings', { isSystemActive: newStatus });
      setIsSystemActive(data.isSystemActive);
    } catch (error) {
      console.error('Failed to update system status', error);
    } finally {
      setTogglingSystem(false);
    }
  };

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSystemStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-xs text-slate-500 font-medium">Loading Attendance Analytics...</p>
      </div>
    );
  }

  // Filter daily trends based on selected timeframe
  const rawTrends = stats?.dailyTrends || [];
  const daysToTake = timeframe === '7' ? 7 : timeframe === '14' ? 14 : rawTrends.length;
  const filteredTrends = rawTrends.slice(-daysToTake);

  // Totals for overall pie chart visualization
  const totalOnTime = filteredTrends.reduce((acc, curr) => acc + (curr.onTime || 0), 0);
  const totalLate = filteredTrends.reduce((acc, curr) => acc + (curr.late || 0), 0);
  
  const pieData = [
    { name: 'On-Time Check-Ins', value: totalOnTime, color: '#6366f1' }, // Indigo
    { name: 'Late Check-Ins', value: totalLate, color: '#f59e0b' }      // Amber
  ];

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-4 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[180px]">
          <p className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{data.date}</span>
            <span className="text-[10px] text-slate-500 font-normal">{data.fullDate}</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-indigo-400 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> On-Time</span>
              <span className="font-bold">{data.onTime}</span>
            </div>
            <div className="flex items-center justify-between text-amber-400 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Late Arrival</span>
              <span className="font-bold">{data.late}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-1 font-bold">
              <span>Total Check-Ins</span>
              <span>{data.total}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-semibold pt-0.5">
              <span>Punctuality Rate</span>
              <span>{data.onTimeRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Attendance Analytics Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Real-time daily trends, on-time vs. late check-in metrics, and workforce compliance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleSystemStatus}
            disabled={togglingSystem}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shadow-md ${
              isSystemActive 
                ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300' 
                : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/50 text-rose-400'
            }`}
          >
            {togglingSystem ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Calendar size={14} className={isSystemActive ? 'text-slate-400' : 'text-rose-400'} />
            )}
            {isSystemActive ? 'Holiday Mode: OFF' : 'Holiday Mode: ON (System Disabled)'}
          </button>
          
          <LiveClock variant="compact" className="py-2 px-3 text-xs" />
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-300 transition-all flex items-center gap-2 shadow-md"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
            {refreshing ? 'Refreshing...' : 'Refresh Live'}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          icon={Users} 
          label="Total Workforce" 
          value={stats?.totalEmployees || 0} 
          subtitle="Registered employees"
        />
        <StatsCard 
          icon={CheckCircle2} 
          label="Today's On-Time" 
          value={stats?.onTimeToday || 0} 
          subtitle={`${stats?.checkInsToday || 0} total check-ins today`}
        />
        <StatsCard 
          icon={AlertTriangle} 
          label="Today's Late Check-Ins" 
          value={stats?.lateToday || 0} 
          subtitle="Flagged past grace period"
        />
        <StatsCard 
          icon={TrendingUp} 
          label="Overall Punctuality" 
          value={`${stats?.presentPercentage || 0}%`} 
          subtitle="Workforce check-in rate"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Primary Recharts Visualization: Daily Attendance Trends (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-indigo-400" size={22} />
                Daily Attendance Trends
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Visualizing daily on-time vs. late check-in counts over time</p>
            </div>

            {/* Interactive Chart Controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Timeframe Selector */}
              <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 flex items-center text-xs font-bold">
                <button
                  onClick={() => setTimeframe('7')}
                  className={`px-3 py-1 rounded-lg transition-all ${timeframe === '7' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTimeframe('14')}
                  className={`px-3 py-1 rounded-lg transition-all ${timeframe === '14' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  14 Days
                </button>
              </div>

              {/* Chart Mode Toggle */}
              <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 flex items-center text-xs">
                <button
                  onClick={() => setChartType('stacked')}
                  title="Stacked Bar Chart"
                  className={`p-1.5 rounded-lg transition-all ${chartType === 'stacked' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={() => setChartType('area')}
                  title="Punctuality Rate Line/Area Chart"
                  className={`p-1.5 rounded-lg transition-all ${chartType === 'area' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <LineChartIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Chart Area */}
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'stacked' ? (
                <BarChart data={filteredTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    content={() => (
                      <div className="flex items-center justify-end gap-6 text-xs font-semibold pb-2">
                        <span className="flex items-center gap-2 text-indigo-400">
                          <span className="w-3 h-3 rounded-md bg-indigo-500" /> On-Time Check-In
                        </span>
                        <span className="flex items-center gap-2 text-amber-400">
                          <span className="w-3 h-3 rounded-md bg-amber-500" /> Late Arrival
                        </span>
                      </div>
                    )}
                  />
                  <Bar dataKey="onTime" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} name="On-Time" />
                  <Bar dataKey="late" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late Arrival" />
                </BarChart>
              ) : (
                <AreaChart data={filteredTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="onTimeRate" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="Punctuality %" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Quick Metrics Footer */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-800/30 rounded-xl">
              <p className="text-slate-500 uppercase font-bold text-[10px]">Total Check-Ins</p>
              <p className="text-sm font-bold text-white mt-0.5">{totalOnTime + totalLate}</p>
            </div>
            <div className="p-2 bg-slate-800/30 rounded-xl">
              <p className="text-slate-500 uppercase font-bold text-[10px]">On-Time Total</p>
              <p className="text-sm font-bold text-indigo-400 mt-0.5">{totalOnTime}</p>
            </div>
            <div className="p-2 bg-slate-800/30 rounded-xl">
              <p className="text-slate-500 uppercase font-bold text-[10px]">Late Total</p>
              <p className="text-sm font-bold text-amber-400 mt-0.5">{totalLate}</p>
            </div>
          </div>
        </div>

        {/* Secondary Visualization: Donut Ratio & Summary */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieChartIcon className="text-amber-400" size={20} />
              Overall Check-In Ratio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution over selected timeframe</p>
          </div>

          {/* Donut Pie Chart */}
          <div className="h-[220px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">
                {totalOnTime + totalLate > 0 ? `${Math.round((totalOnTime / (totalOnTime + totalLate)) * 100)}%` : '0%'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">On-Time</span>
            </div>
          </div>

          {/* Donut Legend Cards */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="p-3 bg-slate-800/40 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="font-semibold text-slate-200">On-Time Check-Ins</span>
              </div>
              <span className="font-bold text-indigo-400">{totalOnTime} ({totalOnTime + totalLate > 0 ? Math.round((totalOnTime / (totalOnTime + totalLate)) * 100) : 0}%)</span>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-slate-200">Late Check-Ins</span>
              </div>
              <span className="font-bold text-amber-400">{totalLate} ({totalOnTime + totalLate > 0 ? Math.round((totalLate / (totalOnTime + totalLate)) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Department Stats & Top Punctual Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Compliance Breakdown */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="text-indigo-400" size={20} />
              Department Punctuality Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-medium">By Department</span>
          </div>

          <div className="space-y-4">
            {(stats?.departmentStats || []).map((dept, idx) => {
              const pct = dept.total > 0 ? Math.round((dept.onTime / dept.total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">{dept.department}</span>
                    <span className="text-slate-400">{dept.onTime} On-Time / {dept.late} Late ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: `${pct}%` }} 
                      title={`${pct}% On-Time`}
                    />
                    <div 
                      className="bg-amber-500 h-full transition-all duration-500" 
                      style={{ width: `${100 - pct}%` }} 
                      title={`${100 - pct}% Late`}
                    />
                  </div>
                </div>
              );
            })}

            {(!stats?.departmentStats || stats.departmentStats.length === 0) && (
              <p className="text-center text-slate-500 text-xs py-6">No department data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Most Punctual Workers Widget */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-amber-400" size={20} />
              Most Punctual Employees
            </h3>
            <span className="text-xs text-slate-400 font-medium">Past 30 Days</span>
          </div>

          <div className="space-y-3">
            {stats?.topEmployees?.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/60 rounded-2xl transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{emp.userDetails?.name || 'Employee'}</p>
                    <p className="text-xs text-slate-400">{emp.userDetails?.department || 'General'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-400">{emp.count} Days</p>
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase">Punctual</p>
                </div>
              </div>
            ))}

            {(!stats?.topEmployees || stats.topEmployees.length === 0) && (
              <p className="text-center text-slate-500 text-xs py-6">No employee records found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
