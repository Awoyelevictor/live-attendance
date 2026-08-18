import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Clock, Check, X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { isPushSupported, getNotificationPermission, subscribeToPush } from '../lib/pushNotifications';
import { useAuth } from '../context/AuthContext';

export default function NotificationPermissionModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    // Only prompt for logged-in users who have browser push support
    if (!user) return;
    if (!isPushSupported()) return;

    const currentPermission = getNotificationPermission();

    // If permission is already denied, browser won't allow prompting
    if (currentPermission === 'denied') return;

    // Check saved preferences
    const alwaysPref = localStorage.getItem('attendly_notification_pref');
    const sessionDismissed = sessionStorage.getItem('attendly_notification_dismissed');
    const sessionPref = sessionStorage.getItem('attendly_notification_pref');

    // If already set to "always" and permission is granted, ensure subscription is active in background
    if (alwaysPref === 'always' && currentPermission === 'granted') {
      subscribeToPush('always').catch(() => {});
      return;
    }

    // If session was already configured or dismissed in this session, skip popup
    if (sessionPref === 'once' || sessionDismissed === 'true') {
      return;
    }

    // Show popup immediately upon entering the app (with a smooth 400ms delay)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [user]);

  const handleAction = async (mode) => {
    setSelectedMode(mode);
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await subscribeToPush(mode);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: mode === 'always' 
            ? 'Push notifications enabled permanently!' 
            : 'Push notifications enabled for this session!'
        });
        setTimeout(() => {
          setIsOpen(false);
        }, 1200);
      } else {
        if (res.permission === 'denied') {
          setStatusMessage({
            type: 'error',
            text: 'Notifications were blocked in your browser settings. You can re-enable them via the lock icon in the address bar.'
          });
        } else {
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.warn('Notification prompt error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Unable to enable notifications right now. You can try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('attendly_notification_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="notification-modal-container"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      >
        <motion.div
          id="notification-modal-card"
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 text-slate-100 overflow-hidden"
        >
          {/* Subtle background gradient glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close / Dismiss Button */}
          <button
            id="notification-modal-close-btn"
            onClick={handleDismiss}
            disabled={loading}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors"
            title="Dismiss for now"
          >
            <X size={18} />
          </button>

          {/* Header & Icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              <Bell className="text-white animate-bounce" size={22} style={{ animationDuration: '2s' }} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Allow Notifications
              </h3>
              <p className="text-xs text-indigo-400 font-medium mt-0.5 flex items-center gap-1">
                <ShieldCheck size={13} />
                Real-Time Updates & Messages
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Get instant alerts when colleagues message you, supervisors broadcast announcements, or shift reminders help you clock in and out on time.
          </p>

          {/* Feedback Status */}
          {statusMessage && (
            <div 
              id="notification-modal-status"
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? <Check size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5">
            {/* Allow Always */}
            <button
              id="notification-allow-always-btn"
              onClick={() => handleAction('always')}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 hover:from-indigo-500 to-indigo-700 hover:to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <Check size={16} className="text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <span className="block leading-none">Allow Always</span>
                  <span className="text-[11px] text-indigo-200 font-normal mt-0.5 block">Recommended • Stay continuously notified</span>
                </div>
              </div>
              {loading && selectedMode === 'always' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : null}
            </button>

            {/* Allow Once */}
            <button
              id="notification-allow-once-btn"
              onClick={() => handleAction('once')}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 text-slate-200 font-semibold text-sm transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center">
                  <Clock size={16} className="text-slate-300 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <span className="block leading-none">Allow Once</span>
                  <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">Enable only for this active browser session</span>
                </div>
              </div>
              {loading && selectedMode === 'once' ? (
                <Loader2 size={18} className="animate-spin text-slate-300" />
              ) : null}
            </button>

            {/* Maybe Later */}
            <div className="pt-2 text-center">
              <button
                id="notification-dismiss-btn"
                onClick={handleDismiss}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium py-1 px-3 rounded-lg transition-colors hover:bg-slate-800/40"
              >
                Not Now / Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
