import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Clock, Calendar, CheckCircle, AlertCircle, Loader2, 
  Camera, ArrowRight, Flame, Trophy, Zap, Sparkles, Award, 
  TrendingUp, Shield, ChevronRight, HelpCircle, Star, ArrowUpRight,
  Upload, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LiveClock from '../../components/LiveClock';
import TraineeLeaderboard from '../../components/TraineeLeaderboard';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WorkerDashboard() {
  const { user, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [checkInRewardData, setCheckInRewardData] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isOutOfGeofence, setIsOutOfGeofence] = useState(false);
  const [nearestLocationDist, setNearestLocationDist] = useState(null);
  const [nearestLocationName, setNearestLocationName] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leaderboard'

  // Inline avatar setup states
  const [capturedAvatar, setCapturedAvatar] = useState('');
  const [showDashboardCamera, setShowDashboardCamera] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const dashboardVideoRef = useRef(null);
  const dashboardFileRef = useRef(null);

  const weeklyTrendData = useMemo(() => {
    if (!data?.recent) return [];
    
    const weeks = [];
    const today = new Date();
    
    // Find the Monday of the current week
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - distanceToMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    for (let i = 3; i >= 0; i--) {
      const mon = new Date(currentMonday);
      mon.setDate(currentMonday.getDate() - i * 7);
      
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      
      weeks.push({
        start: mon,
        end: fri,
        name: mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Present: 0,
        Absent: 0
      });
    }
    
    data.recent.forEach(log => {
      const logDate = new Date(log.date);
      logDate.setHours(12, 0, 0, 0);
      
      weeks.forEach(wk => {
        const startLimit = new Date(wk.start);
        startLimit.setHours(0, 0, 0, 0);
        const endLimit = new Date(wk.end);
        endLimit.setHours(23, 59, 59, 999);
        
        if (logDate >= startLimit && logDate <= endLimit) {
          const day = logDate.getDay();
          if (day >= 1 && day <= 5) {
            if (log.status === 'present' || log.status === 'late') {
              wk.Present++;
            }
          }
        }
      });
    });
    
    weeks.forEach((wk, idx) => {
      if (idx === 3) {
        const currentWorkDay = Math.min(5, today.getDay() === 0 ? 5 : today.getDay());
        wk.Absent = Math.max(0, currentWorkDay - wk.Present);
      } else {
        wk.Absent = Math.max(0, 5 - wk.Present);
      }
    });
    
    return weeks;
  }, [data?.recent]);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio not supported or blocked");
    }
  };

  const playFireSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch (e) {
      console.warn("Audio not supported or blocked");
    }
  };

  const fireParticles = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      size: Math.random() * 18 + 6,
      x: (Math.random() - 0.5) * 380,
      y: -Math.random() * 280 - 100,
      delay: Math.random() * 0.8,
      duration: Math.random() * 1.5 + 1.0,
      rotate: Math.random() * 360,
      color: ['bg-yellow-400', 'bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-orange-600', 'bg-rose-500'][Math.floor(Math.random() * 6)]
    }));
  }, [showSuccessOverlay]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation || !data?.activeLocations?.length) return;

    const deg2rad = (deg) => deg * (Math.PI / 180);
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const handlePosition = (position) => {
      const { latitude, longitude } = position.coords;
      setUserCoords({ lat: latitude, lng: longitude });

      let minDistance = Infinity;
      let nearest = null;

      data.activeLocations.forEach((loc) => {
        const dist = getDistance(latitude, longitude, loc.lat, loc.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = loc;
        }
      });

      if (nearest) {
        setNearestLocationDist(Math.round(minDistance));
        setNearestLocationName(nearest.name);
        setIsOutOfGeofence(minDistance > nearest.radius);
      }
    };

    const handleGeoError = (err) => {
      console.warn("Geofence tracking error:", err.message);
    };

    const geoId = navigator.geolocation.watchPosition(
      handlePosition,
      handleGeoError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    navigator.geolocation.getCurrentPosition(handlePosition, handleGeoError, { enableHighAccuracy: true });

    return () => {
      navigator.geolocation.clearWatch(geoId);
    };
  }, [data]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get('/worker/dashboard');
      setData(data);
      return data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn('Unauthorized access to dashboard data.');
      } else {
        console.warn('Failed to fetch dashboard data:', error.message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const performCheckIn = () => {
    if (!navigator.geolocation) {
      return setMessage({ text: 'Geolocation is not supported by your browser', type: 'error' });
    }

    setCheckingIn(true);
    setMessage({ text: '', type: '' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const userAgent = window.navigator.userAgent;
          const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'MacOS' : userAgent.includes('Linux') ? 'Linux' : 'Mobile';
          const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Other';

          const res = await api.post('/worker/check-in', { 
            lat: latitude, 
            lng: longitude,
            os,
            browser
          });

          setCheckInRewardData(res.data);
          const updatedData = await fetchDashboardData();

          if (res.data.status === 'present') {
            setMessage({ 
              text: `Check-in successful! +${res.data.pointsEarned || 50} Early Bird XP earned. Streak is active!`, 
              type: 'success' 
            });
            playFireSound();
          } else {
            setMessage({ 
              text: 'Late check-in recorded. Please try to arrive on time tomorrow to rebuild your streak.', 
              type: 'error' 
            });
            playSuccessSound();
          }

          setShowSuccessOverlay(true);
          setTimeout(() => setShowSuccessOverlay(false), 4500);
        } catch (error) {
          setMessage({ text: error.response?.data?.message || 'Check-in failed', type: 'error' });
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        setMessage({ text: `Geolocation error: ${error.message}`, type: 'error' });
        setCheckingIn(false);
      }
    );
  };

  const handleCheckIn = () => {
    if (!user?.avatar) {
      setShowAvatarPrompt(true);
      return;
    }
    performCheckIn();
  };

  // Inline Webcam & File Upload Handlers for prompt
  const startDashboardCamera = async () => {
    setShowDashboardCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (dashboardVideoRef.current) {
        dashboardVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Unable to access camera: ' + err.message);
      setShowDashboardCamera(false);
    }
  };

  const captureDashboardPhoto = () => {
    if (dashboardVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(dashboardVideoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedAvatar(dataUrl);

      // Stop camera stream
      const stream = dashboardVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setShowDashboardCamera(false);
    }
  };

  const closeDashboardCamera = () => {
    if (dashboardVideoRef.current && dashboardVideoRef.current.srcObject) {
      const stream = dashboardVideoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowDashboardCamera(false);
  };

  const handleDashboardFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Image size should be less than 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitAvatarAndCheckIn = async () => {
    if (!capturedAvatar) return;
    setSavingAvatar(true);
    try {
      const res = await api.put('/worker/profile', {
        avatar: capturedAvatar
      });
      updateUser(res.data);
      setShowAvatarPrompt(false);
      // Automatically continue with check-in since they now have a valid profile pic!
      performCheckIn();
    } catch (err) {
      console.error('Failed to save avatar directly from check-in:', err);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleCheckOut = () => {
    if (!navigator.geolocation) {
      return setMessage({ text: 'Geolocation is not supported by your browser', type: 'error' });
    }

    setCheckingIn(true);
    setMessage({ text: '', type: '' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await api.post('/worker/check-out', { 
            lat: latitude, 
            lng: longitude
          });

          setMessage({ text: 'Clock-out successful! Great job today.', type: 'success' });
          playSuccessSound();
          setShowSuccessOverlay(true);
          setTimeout(() => setShowSuccessOverlay(false), 2500);
          fetchDashboardData();
        } catch (error) {
          setMessage({ text: error.response?.data?.message || 'Clock-out failed', type: 'error' });
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        setMessage({ text: `Geolocation error: ${error.message}`, type: 'error' });
        setCheckingIn(false);
      }
    );
  };

  // Calculate shift early-bird incentive info
  const earlyBirdCountdown = useMemo(() => {
    if (!data?.workStartTime) return null;
    const [startH, startM] = data.workStartTime.split(':').map(Number);
    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(startH, startM, 0, 0);

    const diffMinutes = Math.round((shiftStart.getTime() - now.getTime()) / (1000 * 60));
    return {
      startTime: data.workStartTime,
      diffMinutes,
      isBeforeShift: diffMinutes > 0,
      isSuperEarlyWindow: diffMinutes >= 15,
      isEarlyWindow: diffMinutes >= 5
    };
  }, [data?.workStartTime]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-3">
      <Loader2 className="animate-spin text-indigo-500" size={36} />
      <p className="text-xs text-slate-500 font-semibold">Syncing Trainee Dashboard & Fire Streaks...</p>
    </div>
  );

  const streak = data?.currentStreak || 0;
  const bestStreak = data?.bestStreak || streak;
  const earlyBirdPoints = data?.earlyBirdPoints || 0;
  const tier = data?.streakTier || {
    rank: 'Spark',
    title: 'Spark Starter',
    flames: streak > 0 ? 1 : 0,
    multiplier: 1.0,
    daysToNext: 3,
    nextTierStreak: 3
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12 relative">
      
      {/* Animated Check-In / Streak Fireworks Celebration Modal */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
            onClick={() => setShowSuccessOverlay(false)}
          >
            {/* Particle Burst */}
            {(streak > 0 || checkInRewardData?.streakIncreased) && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {fireParticles.map((p) => (
                  <motion.div
                    key={p.id}
                    className={`absolute rounded-full filter blur-[1px] ${p.color}`}
                    style={{
                      width: p.size,
                      height: p.size,
                      bottom: '25%',
                      left: `calc(50% + ${p.x}px)`,
                    }}
                    initial={{ opacity: 0, y: 0, scale: 0.1 }}
                    animate={{
                      opacity: [0, 1, 0.8, 0],
                      y: p.y,
                      scale: [0.1, 1.5, 0.8, 0],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -30, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              onClick={e => e.stopPropagation()}
              className={`relative overflow-hidden rounded-3xl p-8 md:p-10 flex flex-col items-center justify-center shadow-2xl border text-center max-w-md w-full ${
                (streak > 0 || checkInRewardData?.streakIncreased)
                  ? 'bg-gradient-to-br from-red-700 via-orange-600 to-amber-500 shadow-orange-500/40 border-orange-400/50' 
                  : 'bg-gradient-to-br from-indigo-700 to-purple-800 shadow-indigo-600/40 border-indigo-400/50'
              }`}
            >
              <div className="relative z-10 space-y-4">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner mx-auto">
                  {(streak > 0 || checkInRewardData?.streakIncreased) ? (
                    <motion.div
                      animate={{ 
                        scale: [1, 1.25, 0.95, 1.15, 1],
                        rotate: [0, -8, 8, -4, 4, 0]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.6,
                        repeatType: "reverse"
                      }}
                      className="text-yellow-300"
                    >
                      <Flame size={64} fill="currentColor" className="drop-shadow-[0_4px_10px_rgba(234,88,12,0.6)]" />
                    </motion.div>
                  ) : (
                    <CheckCircle size={56} className="text-emerald-300" />
                  )}
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white font-bold text-xs mb-2 backdrop-blur-sm">
                    <Sparkles size={13} />
                    {checkInRewardData?.isEarlyBird ? 'Early Bird Check-In!' : 'Attendance Verified'}
                  </span>

                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                    {checkInRewardData?.streakCount 
                      ? `${checkInRewardData.streakCount} Day Streak Active!` 
                      : streak > 0 
                        ? `${streak} Day Streak!` 
                        : 'Check-In Recorded!'}
                  </h2>
                  
                  <p className="text-white/95 font-semibold text-base mt-1">
                    {checkInRewardData?.pointsEarned ? (
                      `+${checkInRewardData.pointsEarned} Early Bird XP Earned!`
                    ) : (
                      'You are keeping the punctuality flame alive!'
                    )}
                  </p>
                </div>

                <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 text-xs text-white/90 space-y-1">
                  <p>Multiplier Active: <strong className="text-yellow-300">{checkInRewardData?.streakTier?.multiplier || tier.multiplier}x Bonus</strong></p>
                  <p>All-Time Record: <strong className="text-white">{Math.max(bestStreak, checkInRewardData?.bestStreak || 0)} Days</strong></p>
                </div>

                <button
                  onClick={() => setShowSuccessOverlay(false)}
                  className="w-full py-3 bg-white text-slate-950 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all shadow-md"
                >
                  Continue to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tabs Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Trainee Portal
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
              <Flame size={13} className="animate-pulse" />
              {streak}d Streak
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Check-in promptly to burn your daily streak and top the trainee leaderboard
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock size={15} />
            Clock In / Overview
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={15} className="text-amber-400" />
            Trainee Leaderboard
            {data?.myLeaderboardRank && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-black">
                #{data.myLeaderboardRank}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 md:space-y-8">
          {/* Live Clock & Action Hero Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-indigo-600/20 via-slate-900 to-purple-600/20 p-6 md:p-8 rounded-3xl border border-indigo-500/20 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-indigo-600 border border-indigo-400/30 overflow-hidden flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/30 shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0] || 'T'
                  )}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    Welcome back, {user?.name?.split(' ')[0]}!
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{user?.department || 'Operations'}</span>
                    <span>•</span>
                    <span>ID: {user?.employeeId || 'EMP-TRAINEE'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-500/10 px-2.5 py-0.5 rounded-full text-xs border border-orange-500/20">
                      <Flame size={12} className="text-orange-500" />
                      {streak > 0 ? `${streak}-Day Streak` : 'Streak: 0 Days'}
                    </span>
                  </p>
                  
                  {isOutOfGeofence && userCoords && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left"
                    >
                      <AlertCircle size={16} className="text-rose-500 animate-pulse shrink-0" />
                      <span className="leading-snug">
                        Outside Perimeter: You are <span className="text-rose-300 font-bold underline">{nearestLocationDist} meters</span> away from <strong className="text-white">{nearestLocationName || 'office'}</strong>. Move closer to check in.
                      </span>
                    </motion.div>
                  )}
                  
          {!isOutOfGeofence && userCoords && !data?.checkedInToday && data?.isSystemActive && !data?.isWeekend && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left"
                    >
                      <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                      <span className="leading-snug">
                        Inside Geofence: You are <span className="text-emerald-300 font-bold">{nearestLocationDist}m</span> from <strong className="text-white">{nearestLocationName}</strong>. Cleared to clock in!
                      </span>
                    </motion.div>
                  )}

                  {data?.isWeekend && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-slate-800 border border-slate-700 text-slate-400 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left"
                    >
                      <Calendar size={16} className="text-slate-500 shrink-0" />
                      <span className="leading-snug">
                        Weekend Mode: Attendance tracking is paused. Systems resume on Monday morning.
                      </span>
                    </motion.div>
                  )}

                  {data?.isSystemActive === false && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left"
                    >
                      <AlertCircle size={16} className="text-rose-500 shrink-0" />
                      <span className="leading-snug">
                        Holiday Shutdown: The admin has disabled the attendance system for holiday/maintenance.
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
                {data?.checkedOutToday ? (
                  <div className="bg-slate-800/80 border border-slate-700/80 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-slate-300 text-sm font-bold shadow-lg">
                    <CheckCircle size={20} className="text-emerald-400" />
                    Shift Completed
                  </div>
                ) : data?.isWeekend || data?.isSystemActive === false ? (
                  <div className="bg-slate-800/80 border border-slate-700/80 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-slate-500 text-sm font-bold shadow-lg">
                    <Clock size={20} className="text-slate-600" />
                    System Inactive
                  </div>
                ) : data?.checkedInToday ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingIn}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2.5 text-sm md:text-base cursor-pointer"
                  >
                    {checkingIn ? <Loader2 className="animate-spin" size={20} /> : <Clock size={20} />}
                    {checkingIn ? 'Locating GPS...' : 'GPS Clock-Out'}
                  </button>
                ) : (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 text-sm md:text-base cursor-pointer"
                  >
                    {checkingIn ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
                    {checkingIn ? 'Locating GPS...' : 'GPS Check-In'}
                  </button>
                )}
              </div>
            </div>

            {/* Live Clock */}
            <LiveClock variant="expanded" className="h-full" />
          </div>

          {/* Action Messages */}
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </motion.div>
          )}

          {/* PERSISTENT DATABASE FIRE STREAK & EARLY BIRD ARENA */}
          <div className="relative overflow-hidden bg-gradient-to-r from-orange-950/40 via-slate-900 to-amber-950/30 border border-orange-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                    <Flame size={36} className="animate-pulse" />
                  </div>
                  {streak > 0 && (
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full shadow-md">
                      {tier.multiplier}x
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {streak > 0 ? `${streak}-Day Punctuality Fire Streak` : 'Start Your Fire Streak Today'}
                    </h3>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tier.borderColor} ${tier.bgColor} ${tier.textColor}`}>
                      {tier.title}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Every on-time or early arrival burns your streak higher in the database and earns <strong className="text-amber-400">Early Bird XP</strong> with high multiplier rewards.
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" />
                      <strong className="text-white">{earlyBirdPoints}</strong> Total XP Points
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Trophy size={14} className="text-yellow-400" />
                      Best Record: <strong className="text-white">{bestStreak} Days</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Award size={14} className="text-indigo-400" />
                      Leaderboard: <strong className="text-white">#{data?.myLeaderboardRank || 1}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trophy size={14} />
                  View Competitors & Standings
                </button>
              </div>
            </div>

            {/* Streak Progress to Next Tier */}
            {tier.nextTierStreak && (
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Next Rank Tier: <strong className="text-white">{tier.daysToNext} more on-time {tier.daysToNext === 1 ? 'day' : 'days'}</strong> to unlock the next level
                  </span>
                  <span className="text-orange-400 font-bold">{streak} / {tier.nextTierStreak} Days</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (streak / tier.nextTierStreak) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Shift Early Bird Incentive Box */}
            {earlyBirdCountdown && !data?.checkedInToday && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  <span>
                    Shift starts at <strong className="text-white font-bold">{earlyBirdCountdown.startTime}</strong>. Clock in at least 5 minutes early to claim <strong className="text-yellow-300 font-bold">+100 Super Early Bird XP</strong>!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard icon={Calendar} label="Days Present" value={data?.daysPresent || 0} subtitle="This month" />
            <StatsCard icon={Flame} label="Active Streak" value={`${streak} Days`} subtitle={`Best: ${bestStreak} Days`} />
            <StatsCard icon={Zap} label="Early Bird XP" value={earlyBirdPoints} subtitle={`${tier.multiplier}x active multiplier`} />
            <StatsCard icon={Clock} label="Shift Start Time" value={data?.workStartTime || '09:00'} subtitle={`Grace: ${data?.gracePeriod || 15} mins`} />
          </div>

          {/* Weekly Attendance Trend Chart */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Weekly Attendance Trend
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparing days present versus absent over the last 4 calendar weeks (Monday–Friday workweeks).
              </p>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                    domain={[0, 5]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '16px',
                      color: '#fff' 
                    }} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-slate-300 font-semibold">{value}</span>}
                  />
                  <Bar 
                    dataKey="Present" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={45}
                  />
                  <Bar 
                    dataKey="Absent" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Attendance Table */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Recent Attendance Logs</h3>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last 10 Records</p>
            </div>
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-800/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check-Out</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {data?.recent?.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300 font-medium">{record.date}</td>
                      <td className="px-6 py-4 text-sm text-white font-bold">{record.checkInTime}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{record.checkOutTime || 'Active'}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{record.location}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))}
                  {(!data?.recent || data.recent.length === 0) && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No attendance records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trainee Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <TraineeLeaderboard currentUserId={user?._id} onRefresh={fetchDashboardData} />
      )}

      {/* Profile Picture Required Modal */}
      <AnimatePresence>
        {showAvatarPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <Camera size={24} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Biometric Identity Verification</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  To ensure workplace compliance and accurate identity records, setting a profile picture is <strong className="text-amber-400 font-semibold">required</strong> before you can check in.
                </p>
              </div>

              {/* Live Video / Captured Image Box */}
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner group">
                {showDashboardCamera ? (
                  <video 
                    ref={dashboardVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : capturedAvatar ? (
                  <img 
                    src={capturedAvatar} 
                    alt="Captured Bio" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-slate-600 text-xs flex flex-col items-center gap-1.5 p-4 text-center">
                    <span className="font-semibold block text-slate-500">No Image Prepared</span>
                    <span>Use webcam or choose a local photo file below</span>
                  </div>
                )}
                {showDashboardCamera && (
                  <div className="absolute bottom-2 inset-x-2 flex justify-center">
                    <button
                      type="button"
                      onClick={captureDashboardPhoto}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] uppercase shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Capture Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Action Source Buttons */}
              <div className="flex justify-center gap-3">
                {!showDashboardCamera && (
                  <button
                    type="button"
                    onClick={startDashboardCamera}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera size={14} />
                    {capturedAvatar ? 'Retake Photo' : 'Webcam'}
                  </button>
                )}
                {showDashboardCamera && (
                  <button
                    type="button"
                    onClick={closeDashboardCamera}
                    className="px-4 py-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Stop Camera
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dashboardFileRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload size={14} />
                  Choose File
                </button>
                <input 
                  type="file"
                  ref={dashboardFileRef}
                  onChange={handleDashboardFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    closeDashboardCamera();
                    setShowAvatarPrompt(false);
                  }}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                {capturedAvatar ? (
                  <button
                    type="button"
                    onClick={submitAvatarAndCheckIn}
                    disabled={savingAvatar}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    {savingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    {savingAvatar ? 'Saving Image...' : 'Verify & Check-In'}
                  </button>
                ) : (
                  <Link
                    to="/worker/profile"
                    onClick={() => {
                      closeDashboardCamera();
                      setShowAvatarPrompt(false);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    Go to Profile <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
