import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, User, Edit2, Shield, Power, Trash2, ShieldAlert, Filter, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { motion } from 'motion/react';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users?role=all');
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userItem) => {
    if (!isAdmin) return;
    
    // Cycle: trainee -> supervisor -> admin -> trainee
    let newRole = 'supervisor';
    if (userItem.role === 'trainee' || userItem.role === 'worker') newRole = 'supervisor';
    else if (userItem.role === 'supervisor') newRole = 'admin';
    else if (userItem.role === 'admin') newRole = 'trainee';

    const confirmText = `Change ${userItem.name}'s role to ${newRole.toUpperCase()}?`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.put(`/admin/users/${userItem._id}`, { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role', error);
    }
  };

  const toggleStatus = async (userItem) => {
    if (!isAdmin) return;
    try {
      const newStatus = userItem.status === 'Active' ? 'Suspended' : 'Active';
      await api.put(`/admin/users/${userItem._id}`, { status: newStatus });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle status', error);
    }
  };

  const deleteUser = async (id) => {
    if (!isAdmin) return;
    if (id === currentUser?._id) {
      alert("You cannot delete your own admin account. Please ask another administrator to delete your account.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      alert('Employee deleted successfully.');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
      alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredUsers = users.filter(userItem => {
    const matchesSearch = 
      userItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' || 
      userItem.role === roleFilter ||
      (roleFilter === 'trainee' && (userItem.role === 'trainee' || userItem.role === 'worker'));

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Employees & Team Members</h1>
          <p className="text-slate-400 mt-1">
            {isAdmin ? 'Manage workforce roles, access levels, and account statuses' : 'View company workforce directory and employee profiles'}
          </p>
        </div>
        {isAdmin && (
          <Link 
            to="/admin/users/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <UserPlus size={20} />
            Add Employee
          </Link>
        )}
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-2.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
              <span className="text-xs font-bold text-slate-400 pl-3 pr-1 flex items-center gap-1">
                <Filter size={14} /> Role:
              </span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter('trainee')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === 'trainee' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Trainees
              </button>
              <button
                onClick={() => setRoleFilter('supervisor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === 'supervisor' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Supervisors
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === 'admin' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Admins
              </button>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-white font-bold">{filteredUsers.length}</span> members
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Schedule</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map((userItem) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={userItem._id} 
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-slate-700 overflow-hidden shrink-0">
                        {userItem.avatar ? <img src={userItem.avatar} alt="" className="w-full h-full object-cover" /> : (userItem.name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{userItem.name}</p>
                        <p className="text-xs text-slate-500">{userItem.email}</p>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{userItem.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {userItem.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <ShieldAlert size={12} /> Admin
                      </span>
                    ) : userItem.role === 'supervisor' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Shield size={12} /> Supervisor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        Trainee
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{userItem.department || 'N/A'}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-indigo-300">
                    {userItem.role === 'trainee' || userItem.role === 'worker' ? (
                      <span className="inline-flex items-center gap-1 text-orange-400 font-bold">
                        <Flame size={13} className="text-orange-500 shrink-0" />
                        <span>{userItem.punctualityStreak || 0}d ({userItem.earlyBirdPoints || 0} XP)</span>
                      </span>
                    ) : (
                      'Location Synced'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={userItem.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      {isAdmin && (
                        <button 
                          onClick={() => toggleRole(userItem)}
                          className="p-2 hover:bg-purple-500/10 text-purple-400 rounded-lg transition-colors"
                          title={`Current: ${userItem.role}. Click to cycle role (Worker -> Supervisor -> Admin)`}
                        >
                          <Shield size={18} />
                        </button>
                      )}
                      <Link to={`/admin/users/${userItem._id}`} className="p-2 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-colors" title="View Details">
                        <User size={18} />
                      </Link>
                      {isAdmin && (
                        <>
                          <Link to={`/admin/users/${userItem._id}/edit`} className="p-2 hover:bg-amber-500/10 text-amber-400 rounded-lg transition-colors" title="Edit Employee">
                            <Edit2 size={18} />
                          </Link>
                          <button 
                            onClick={() => toggleStatus(userItem)}
                            className={`p-2 rounded-lg transition-colors ${userItem.status === 'Active' ? 'hover:bg-rose-500/10 text-rose-400' : 'hover:bg-emerald-500/10 text-emerald-400'}`} 
                            title={userItem.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                          >
                            <Power size={18} />
                          </button>
                          <button 
                            onClick={() => deleteUser(userItem._id)}
                            className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors" 
                            title="Delete Employee"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No employees found matching your criteria.
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
