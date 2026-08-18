import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Clock, AlertTriangle, AlertCircle, CheckCircle, Navigation, X, Volume2, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';

export default function WorkerAlertManager({ user }) {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  
  // Custom simulation offset in minutes for testing alerts anytime
  const [simulatedTimeOffset, setSimulatedTimeOffset] = useState(0); 
  const [showSimControls, setShowSimControls] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState('');

  // Fetch shift and attendance status
  const fetchShiftInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/worker/dashboard');
      setShiftData(data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn('Unauthorized access to shift info, user may be logged out.');
      } else {
        console.warn('Network error loading shift info for alerts:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftInfo();
    // Poll shift info every 30 seconds
    const interval = setInterval(fetchShiftInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  // Request browser notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported by your browser.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const sendNativeNotification = async (title, body, tag) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            tag,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            renotify: true,
            requireInteraction: true,
            data: { url: '/worker/dashboard' }
          });
        } else {
          new Notification(title, {
            body,
            tag,
            icon: '/favicon.ico'
          });
        }
      } catch (e) {
        console.warn('Native notification failed', e);
      }
    }
  };

  // Time calculations
  const calculateShiftStatus = () => {
    if (!shiftData) return { status: 'NORMAL', msg: '', minsLeft: 0 };

    const { 
      workStartTime = '09:00', 
      workEndTime = '17:00', 
      gracePeriod = 15, 
      checkedInToday,
      checkedOutToday 
    } = shiftData;

    // Current time + simulated offset
    const now = new Date();
    const effectiveNow = new Date(now.getTime() + simulatedTimeOffset * 60000);
    const todayStr = effectiveNow.toISOString().split('T')[0];

    const [startH, startM] = workStartTime.split(':').map(Number);
    const shiftStartMinutes = startH * 60 + startM;
    const [endH, endM] = workEndTime.split(':').map(Number);
    const shiftEndMinutes = endH * 60 + endM;

    const currentMinutes = effectiveNow.getHours() * 60 + effectiveNow.getMinutes();
    const graceEndMinutes = shiftStartMinutes + gracePeriod;

    const diffToStart = shiftStartMinutes - currentMinutes; // > 0 if before start
    const graceMinutesLeft = graceEndMinutes - currentMinutes;

    // If already clocked out for today
    if (checkedOutToday) {
      return { status: 'CHECKED_OUT', msg: 'You have clocked out for today.', minsLeft: 0 };
    }

    // If clocked in but not yet clocked out -> Check for Clock-Out reminder
    if (checkedInToday) {
      if (currentMinutes >= shiftEndMinutes && currentMinutes <= shiftEndMinutes + 120) {
        const tag = `attendly_clockout_${todayStr}`;
        if (!localStorage.getItem(tag)) {
          sendNativeNotification(
            'Shift Ended - Clock-Out Reminder',
            `Your shift ended at ${workEndTime}. Don't forget to record your clock-out!`,
            tag
          );
          localStorage.setItem(tag, 'true');
        }
        return {
          status: 'CLOCKOUT_REMINDER',
          title: 'Shift Ended',
          msg: `Your scheduled shift ended at ${workEndTime}. Don't forget to clock out!`,
          minsLeft: 0
        };
      }
      return { status: 'CHECKED_IN', msg: 'You are clocked in for today\'s shift.', minsLeft: 0 };
    }

    // Not yet checked in:
    // Case 1: Approaching shift start (within 30 mins before start)
    if (diffToStart > 0 && diffToStart <= 30) {
      const tag = `attendly_approaching_${todayStr}`;
      if (!localStorage.getItem(tag)) {
        sendNativeNotification(
          `Shift Starts in ${diffToStart} mins!`,
          `Your shift starts at ${workStartTime}. Please prepare to clock in.`,
          tag
        );
        localStorage.setItem(tag, 'true');
      }
      return {
        status: 'APPROACHING',
        title: 'Shift Starting Soon',
        msg: `Your shift starts at ${workStartTime} (in ${diffToStart} min${diffToStart === 1 ? '' : 's'}). Don't forget to clock in!`,
        minsLeft: diffToStart
      };
    }

    // Case 2: Grace period active (between shift start and start + gracePeriod)
    if (currentMinutes >= shiftStartMinutes && currentMinutes <= graceEndMinutes) {
      const tag = `attendly_grace_${todayStr}`;
      if (!localStorage.getItem(tag)) {
        sendNativeNotification(
          `Shift Started - Grace Period Active!`,
          `Your shift started at ${workStartTime}. You have ${graceMinutesLeft} mins left to clock in without a late mark.`,
          tag
        );
        localStorage.setItem(tag, 'true');
      }
      return {
        status: 'GRACE_PERIOD',
        title: 'Grace Period Active',
        msg: `Shift started at ${workStartTime}! You have ${graceMinutesLeft} min${graceMinutesLeft === 1 ? '' : 's'} left to clock in without penalty.`,
        minsLeft: graceMinutesLeft
      };
    }

    // Case 3: Late / Grace period passed (after graceEndMinutes)
    if (currentMinutes > graceEndMinutes && currentMinutes < shiftStartMinutes + 600) {
      const minsLate = currentMinutes - shiftStartMinutes;
      const tag = `attendly_late_${todayStr}`;
      if (!localStorage.getItem(tag)) {
        sendNativeNotification(
          `Late Clock-In Notice`,
          `Your shift started at ${workStartTime} (${minsLate} mins ago). Grace period has expired. Please clock in immediately!`,
          tag
        );
        localStorage.setItem(tag, 'true');
      }
      return {
        status: 'LATE_WARNING',
        title: 'Grace Period Expired',
        msg: `Missed Clock-In: Your shift started at ${workStartTime} (${minsLate} mins ago). Please clock in now!`,
        minsLate
      };
    }

    return { status: 'NORMAL', msg: '', minsLeft: 0 };
  };

  const alertInfo = calculateShiftStatus();

  // Handle direct clock-in from banner
  const handleDirectClockIn = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is required for clock-in.');
      return;
    }

    setCheckingIn(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const userAgent = window.navigator.userAgent;
          const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'MacOS' : 'Mobile';
          const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : 'Browser';

          await api.post('/worker/check-in', {
            lat: latitude,
            lng: longitude,
            os,
            browser
          });

          setCheckInSuccessMsg('Successfully clocked in!');
          fetchShiftInfo();
          setTimeout(() => setCheckInSuccessMsg(''), 4000);
        } catch (err) {
          alert(err.response?.data?.message || 'Clock-in failed');
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        alert(`GPS location error: ${error.message}`);
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Preset time simulation helpers
  const setSimMinutes = (minutesBeforeOrAfterStart) => {
    if (!shiftData?.workStartTime) return;
    const [startH, startM] = shiftData.workStartTime.split(':').map(Number);
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const targetMins = startH * 60 + startM + minutesBeforeOrAfterStart;
    const offsetNeeded = targetMins - currentMins;

    setSimulatedTimeOffset(offsetNeeded);
    setBannerDismissed(false);
  };

  if (loading || !shiftData) return null;

  const isAlertActive = alertInfo.status === 'APPROACHING' || alertInfo.status === 'GRACE_PERIOD' || alertInfo.status === 'LATE_WARNING';

  return (
    <div className="relative">
      {/* Top Banner Alert Bar */}
      <AnimatePresence>
        {isAlertActive && !bannerDismissed && !shiftData.checkedInToday && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 py-3 border-b text-sm font-medium flex items-center justify-between gap-3 shadow-lg z-20 ${
              alertInfo.status === 'GRACE_PERIOD'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                : alertInfo.status === 'LATE_WARNING'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${
                alertInfo.status === 'GRACE_PERIOD' ? 'bg-amber-500/20 text-amber-400' :
                alertInfo.status === 'LATE_WARNING' ? 'bg-rose-500/20 text-rose-400 animate-pulse' :
                'bg-indigo-500/20 text-indigo-400'
              }`}>
                {alertInfo.status === 'GRACE_PERIOD' ? <AlertTriangle size={18} /> :
                 alertInfo.status === 'LATE_WARNING' ? <AlertCircle size={18} /> :
                 <Clock size={18} />}
              </div>

              <div className="min-w-0">
                <span className="font-bold mr-2 text-white uppercase text-xs tracking-wider px-2 py-0.5 rounded-md bg-white/10">
                  {alertInfo.title}
                </span>
                <span className="text-xs sm:text-sm font-medium line-clamp-1 sm:line-clamp-none">{alertInfo.msg}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {checkInSuccessMsg ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={14} /> {checkInSuccessMsg}
                </span>
              ) : (
                <button
                  onClick={handleDirectClockIn}
                  disabled={checkingIn}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 shrink-0 ${
                    alertInfo.status === 'GRACE_PERIOD' ? 'bg-amber-600 hover:bg-amber-500' :
                    alertInfo.status === 'LATE_WARNING' ? 'bg-rose-600 hover:bg-rose-500 animate-bounce' :
                    'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {checkingIn ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  {checkingIn ? 'Checking In...' : 'Clock In Now'}
                </button>
              )}

              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Dismiss Banner"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bell / Shift Alert Center Control */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <button
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`p-3.5 rounded-full shadow-2xl border transition-all flex items-center justify-center relative group ${
              isAlertActive && !shiftData.checkedInToday
                ? 'bg-amber-600 text-white border-amber-400 ring-4 ring-amber-500/30 animate-pulse'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Shift Alert Center"
          >
            <Bell size={22} />
            {isAlertActive && !shiftData.checkedInToday && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900 animate-ping" />
            )}
            {isAlertActive && !shiftData.checkedInToday && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900" />
            )}
          </button>

          {/* Shift Alert Center Drawer Popover */}
          <AnimatePresence>
            {popoverOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-16 right-0 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 z-50 text-slate-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="text-indigo-400" size={18} />
                    <h3 className="text-base font-bold text-white">Shift Alert Notifications</h3>
                  </div>
                  <button onClick={() => setPopoverOpen(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={16} />
                  </button>
                </div>

                {/* Desktop Notification Toggle Status */}
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      {permission === 'granted' ? <Volume2 size={14} className="text-emerald-400" /> : <BellOff size={14} className="text-amber-400" />}
                      Browser Desktop Popups
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {permission === 'granted' ? 'Native desktop alerts enabled' : 'Get notified even when browser tab is closed'}
                    </p>
                  </div>
                  {permission !== 'granted' && (
                    <button
                      onClick={requestPermission}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all shrink-0"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {/* Shift Details Summary */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Shift Start Time:</span>
                    <span className="font-bold text-white">{shiftData.workStartTime || '09:00'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Allowed Grace Period:</span>
                    <span className="font-bold text-indigo-300">+{shiftData.gracePeriod || 15} mins</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Today's Clock-In Status:</span>
                    <span className={`font-bold ${shiftData.checkedInToday ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {shiftData.checkedInToday ? 'Clocked In' : 'Not Clocked In'}
                    </span>
                  </div>
                </div>

                {/* Current Active Status Card */}
                <div className={`p-3.5 rounded-2xl border text-xs font-medium ${
                  shiftData.checkedInToday ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                  alertInfo.status === 'GRACE_PERIOD' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                  alertInfo.status === 'LATE_WARNING' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                  alertInfo.status === 'APPROACHING' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' :
                  'bg-slate-800/50 border-slate-700/50 text-slate-400'
                }`}>
                  <p className="font-bold uppercase tracking-wider text-[10px] mb-1 opacity-80">Current Alert Status</p>
                  <p className="leading-relaxed">{alertInfo.msg || (shiftData.checkedInToday ? 'You are on shift.' : 'No active alerts for current time.')}</p>
                </div>

                {/* Simulator Toggle for Demo / Testing */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowSimControls(!showSimControls)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-between w-full"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles size={13} /> Test / Simulate Shift Alerts
                    </span>
                    <span>{showSimControls ? 'Hide' : 'Test'}</span>
                  </button>

                  {showSimControls && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-400">Simulate shift alert states instantly:</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setSimMinutes(-15)}
                          className="px-2 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-xl text-[10px] font-bold"
                        >
                          15m Before
                        </button>
                        <button
                          onClick={() => setSimMinutes(5)}
                          className="px-2 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 rounded-xl text-[10px] font-bold"
                        >
                          Grace Period
                        </button>
                        <button
                          onClick={() => setSimMinutes(30)}
                          className="px-2 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/30 rounded-xl text-[10px] font-bold"
                        >
                          Grace Passed
                        </button>
                      </div>
                      {simulatedTimeOffset !== 0 && (
                        <button
                          onClick={() => { setSimulatedTimeOffset(0); setBannerDismissed(false); }}
                          className="text-[10px] text-slate-400 underline font-semibold block text-center w-full mt-1"
                        >
                          Reset to Real Clock Time
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
