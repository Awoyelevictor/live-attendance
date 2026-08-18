import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, User, Mail, Lock, Phone, Briefcase, Clock, Hash, Loader2, AlertCircle, Save, Shield } from 'lucide-react';
import api from '../../lib/api';
import AnimatedPasswordInput from '../../components/AnimatedPasswordInput';

export default function AdminUserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const password = watch("password", "");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/admin/users/${id}`);
        reset({
          name: data.name,
          email: data.email,
          role: data.role || 'worker',
          phone: data.phone || '',
          avatar: data.avatar || '',
          employeeId: data.employeeId || '',
          department: data.department || '',
          workStartTime: data.workStartTime || '09:00',
          workEndTime: data.workEndTime || '17:00',
          status: data.status
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, reset]);

  const onSubmit = async (data) => {
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/admin/users/${id}`, data);
      navigate(`/admin/users/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-4">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Edit Employee</h1>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                <input {...register("name", { required: true })} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input {...register("email", { required: true })} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-indigo-400 mb-2 font-semibold flex items-center gap-2">
                  <Shield size={16} /> System Role
                </label>
                <select {...register("role")} className="w-full bg-slate-800/50 border border-indigo-500/40 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none font-semibold text-xs sm:text-sm">
                  <option value="trainee">Trainee (Attendance & Team Communication)</option>
                  <option value="supervisor">Supervisor (Shift Oversight & Team Messaging)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                <select {...register("status")} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Department</label>
                <select {...register("department")} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2.5 text-indigo-300 text-xs">
                <Clock size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white mb-0.5">Shift Schedule Managed Centrally</p>
                  <p className="text-slate-400 leading-snug">
                    Clock-In & Clock-Out times are set by Admin in <strong className="text-white">Office Locations</strong>. Changes there apply to all employees.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Profile Picture Image URL</label>
                <input {...register("avatar")} placeholder="https://images.unsplash.com/photo-..." className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs" />
              </div>
              <div>
                <AnimatedPasswordInput
                  label="New Password (optional)"
                  register={register("password")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Update Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
