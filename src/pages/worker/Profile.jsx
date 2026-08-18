import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Lock, Loader2, AlertCircle, CheckCircle, Camera, Upload, Image as ImageIcon, Sparkles, Check, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
];

export default function WorkerProfile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  const password = watch("newPassword", "");

  // Handle local image file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setMessage({ text: 'Image size should be less than 3MB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        setMessage({ text: 'Photo ready to save! Click "Save Profile & Picture" below.', type: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };

  // Start webcam
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setMessage({ text: 'Unable to access camera: ' + err.message, type: 'error' });
      setShowCamera(false);
    }
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setAvatar(dataUrl);

      // Stop camera stream
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
      setMessage({ text: 'Camera snapshot captured! Save profile to confirm.', type: 'success' });
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const onSubmit = async (data) => {
    if (!avatar) {
      setMessage({ text: 'A Profile Picture is strictly REQUIRED for account compliance.', type: 'error' });
      return;
    }

    setMessage({ text: '', type: '' });
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        avatar: avatar
      };
      if (data.newPassword) {
        payload.password = data.newPassword;
      }
      
      const res = await api.put('/worker/profile', payload);
      updateUser(res.data);
      setMessage({ text: 'Profile & picture updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Account & Profile</h1>
        <p className="text-slate-400 mt-1">Manage your identity details, security credentials, and profile picture</p>
      </div>

      {!user?.avatar && !avatar && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-amber-300 text-xs sm:text-sm font-semibold gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-amber-400" />
            <span><strong>Action Required:</strong> You must set a Profile Picture to comply with workplace attendance regulations.</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Avatar Preview & Fast Selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl text-center flex flex-col items-center">
            
            {/* Avatar Circle Container */}
            <div className="relative group mb-4">
              <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden flex items-center justify-center text-white text-4xl font-bold shadow-2xl transition-all group-hover:border-indigo-500">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-400">{user?.name?.[0] || 'U'}</span>
                )}
              </div>

              {/* Requirement Badge */}
              <div className={`absolute -bottom-1 right-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg border ${
                avatar ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500 animate-pulse'
              }`}>
                {avatar ? <Check size={12} /> : '! Required'}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white">{user?.name}</h3>
            <p className="text-slate-500 text-xs font-semibold capitalize mt-0.5">{user?.role}</p>

            {/* Streak & Early Bird Badge (if trainee or worker) */}
            <div className="w-full mt-4 p-3 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame size={14} /> Punctuality Streak
                </span>
                <span className="text-xs font-black text-amber-400">
                  {user?.earlyBirdPoints || 0} XP
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold">{user?.punctualityStreak || 0} Active Days</span>
                <span className="text-slate-400">Best: {user?.bestStreak || 0} Days</span>
              </div>
            </div>

            {/* Quick Action Buttons for Profile Picture */}
            <div className="w-full mt-6 space-y-2.5 pt-4 border-t border-slate-800">
              <p className="text-xs font-bold text-slate-400 text-left flex items-center gap-1.5 mb-2">
                <Camera size={14} className="text-indigo-400" /> Set Profile Picture (Required)
              </p>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Upload size={14} /> Upload Custom Photo
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2.5 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Camera size={14} /> Take Webcam Snapshot
              </button>
            </div>

            {/* Preset Avatar Picker */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 text-left mb-2 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" /> Or Choose Preset Avatar:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(preset);
                      setMessage({ text: 'Preset picture selected! Save changes to apply.', type: 'success' });
                    }}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all mx-auto ${
                      avatar === preset ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30' : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Section: Webcam Stream Modal or Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <AnimatePresence>
            {showCamera && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="text-indigo-400" size={18} /> Take Profile Picture
                  </h3>
                  <button type="button" onClick={closeCamera} className="text-slate-400 hover:text-white text-xs font-bold">
                    Cancel
                  </button>
                </div>

                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Camera size={16} /> Capture Snapshot
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
              {message.text && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                  message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white border-l-4 border-indigo-500 pl-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        {...register("name", { required: "Name is required" })}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address (Read-Only)</label>
                    <div className="relative opacity-60">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        {...register("email")}
                        disabled
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        {...register("phone")}
                        placeholder="+1 555-0199"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Picture Image URL (Optional)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="text"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-6 pt-6 border-t border-slate-800/50">
                <h3 className="text-lg font-bold text-white border-l-4 border-indigo-500 pl-3">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        {...register("newPassword")}
                        type="password"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        {...register("confirmPassword", {
                          validate: value => !password || value === password || "Passwords do not match"
                        })}
                        type="password"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Confirm new password"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-rose-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800/50">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 min-w-[220px] text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Profile & Picture'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
