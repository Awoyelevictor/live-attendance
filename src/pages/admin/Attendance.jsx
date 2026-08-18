import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, MapPin, Eye, Edit2, Loader2, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function AdminAttendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: '', department: '', status: '', date: '' });

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const { data } = await api.get('/admin/attendance');
      setAttendance(data);
    } catch (error) {
      console.error('Failed to fetch attendance', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api.delete(`/admin/attendance/${id}`);
      fetchAttendance();
    } catch (error) {
      console.error('Failed to delete record', error);
    }
  };

  const filteredData = attendance.filter(record => {
    return (
      (filters.name === '' || record.user?.name.toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.department === '' || record.user?.department === filters.department) &&
      (filters.status === '' || record.status === filters.status) &&
      (filters.date === '' || record.date === filters.date)
    );
  });

  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Records</h1>
          <p className="text-slate-400 mt-1">Monitor daily check-ins across the entire organization</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search employee..."
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-12 pr-4 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-500 uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Dept</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Check-Out</th>
                <th className="px-6 py-4">Location & Coordinates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} /></td>
                </tr>
              ) : filteredData.map((record) => (
                <tr key={record._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-indigo-400 font-bold border border-slate-700 overflow-hidden shrink-0">
                        {record.user?.avatar ? <img src={record.user.avatar} alt="" className="w-full h-full object-cover" /> : (record.user?.name?.[0] || 'U')}
                      </div>
                      <div className="font-bold text-white">{record.user?.name || 'Unknown'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{record.user?.department || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-300">{record.date}</td>
                  <td className="px-6 py-4 text-indigo-300 font-bold">{record.checkInTime || '-'}</td>
                  <td className="px-6 py-4 text-amber-300 font-bold">{record.checkOutTime || <span className="text-slate-600 text-xs italic">Active</span>}</td>
                  <td className="px-6 py-4 text-slate-400">
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500" /> {record.location || '-'}
                      </span>
                      {record.coordinates && (
                        <span className="font-mono text-slate-400 text-[11px] mt-0.5">
                          {record.coordinates.lat?.toFixed(4)}, {record.coordinates.lng?.toFixed(4)} ({record.distance ? `${record.distance}m` : ''})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/admin/attendance/${record._id}/edit`}
                          className="p-2 hover:bg-amber-500/10 text-amber-400 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button 
                          onClick={() => deleteRecord(record._id)}
                          className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">No matching attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
