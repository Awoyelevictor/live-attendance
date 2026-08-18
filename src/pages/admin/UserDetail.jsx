import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Briefcase, Clock, Hash, Edit2, History, MapPin, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { motion } from 'motion/react';

export default function AdminUserDetail() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get(`/admin/users/${id}`);
        setUser(userRes.data);
        
        const attRes = await api.get(`/admin/attendance`);
        setHistory(attRes.data.filter(a => a.user?._id === id || a.user === id));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!user) return <div className="text-center text-slate-500 py-12">User not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={20} /> Back
        </button>
        {isAdmin && (
          <Link to={`/admin/users/${id}/edit`} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
            <Edit2 size={18} /> Edit Profile
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-8 rounded-3xl shadow-xl text-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 mx-auto mb-4 flex items-center justify-center text-indigo-400 text-3xl font-bold overflow-hidden shadow-xl">
              {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : (user.name?.[0] || 'U')}
            </div>
            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
            <p className="text-slate-500">{user.department}</p>
            
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {user.role === 'admin' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Administrator
                </span>
              ) : user.role === 'supervisor' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Supervisor
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Worker
                </span>
              )}
              <StatusBadge status={user.status} />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Contact Details</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-3 p-2 text-slate-300">
                <Mail size={16} className="text-indigo-400" />
                <span className="text-sm truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 p-2 text-slate-300">
                <Phone size={16} className="text-indigo-400" />
                <span className="text-sm">{user.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 p-2 text-slate-300">
                <Hash size={16} className="text-indigo-400" />
                <span className="text-sm">{user.employeeId}</span>
              </div>
              <div className="flex items-center gap-3 p-2 text-slate-300">
                <Clock size={16} className="text-indigo-400" />
                <span className="text-sm">Shift: Managed by Location</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={20} className="text-indigo-400" />
                Attendance History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-500 uppercase font-bold tracking-wider text-xs">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Check-In</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {history.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">{record.date}</td>
                      <td className="px-6 py-4 text-sm text-white font-bold">{record.checkInTime}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 flex items-center gap-1">
                        <MapPin size={14} className="text-slate-600" /> {record.location}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">No records found for this employee.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
