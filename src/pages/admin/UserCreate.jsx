import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, User, Mail, Lock, Phone, Briefcase, Clock, Hash, Loader2, AlertCircle, Shield } from 'lucide-react';
import api from '../../lib/api';
import { motion } from 'motion/react';
import AnimatedPasswordInput from '../../components/AnimatedPasswordInput';

export default function AdminUserCreate() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const password = watch("password", "");

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/admin/users', data);
      navigate('/admin/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={20} />
        Back to Employees
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Add New Employee</h1>
          <p className="text-slate-400 mt-1">Fill in the details to create a new worker account</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        {error && (
          <div className="m-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white border-l-4 border-indigo-500 pl-3">Personal Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      {...register("name", { required: "Name is required" })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      {...register("email", { required: "Email is required" })}
                      type="email"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      {...register("phone")}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white border-l-4 border-indigo-500 pl-3">Work Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">System Role</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                      <select
                        {...register("role")}
                        defaultValue="trainee"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none font-semibold text-xs sm:text-sm"
                      >
                        <option value="trainee">Trainee (Attendance & Team Communication)</option>
                        <option value="supervisor">Supervisor (Shift Oversight & Team Messaging)</option>
                        <option value="admin">Admin (Full System Access)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Department</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <select
                        {...register("department")}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                      >
                        <option value="">Select Dept</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 text-indigo-300 text-xs">
                  <Clock size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white mb-0.5">Shift Schedule Managed Centrally</p>
                    <p className="text-slate-400 leading-relaxed">
                      Clock-In & Clock-Out times are set by Admin under <strong className="text-white">Office Locations</strong> settings. When Admin updates location shift times, it automatically applies to all employees.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="space-y-6 md:col-span-2 pt-4 border-t border-slate-800/50">
              <h3 className="text-lg font-bold text-white">Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <AnimatedPasswordInput
                    label="Password"
                    register={register("password", { required: "Password is required" })}
                    placeholder="••••••••"
                    error={errors.password?.message}
                  />
                </div>
                <div>
                  <AnimatedPasswordInput
                    label="Confirm Password"
                    register={register("confirmPassword", { 
                      validate: value => value === password || "Passwords do not match"
                    })}
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 min-w-[160px]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
