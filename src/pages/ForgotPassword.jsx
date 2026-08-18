import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Inbox, 
  AlertTriangle, 
  Layers, 
  Copy, 
  Check, 
  RefreshCw, 
  Sparkles,
  ShieldAlert,
  Clock,
  ExternalLink,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import AnimatedPasswordInput from '../components/AnimatedPasswordInput';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailSentLive, setEmailSentLive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // OTP Resend Countdown
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  // Sandbox OTP preview helper for immediate sandbox testing
  const [sandboxOtp, setSandboxOtp] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Active guide tab in Step 2: 'spam' | 'inbox' | 'promotions'
  const [activeGuideTab, setActiveGuideTab] = useState('spam');

  const otpInputsRef = useRef([]);
  const navigate = useNavigate();

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (step === 2 && timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Request OTP
  const handleRequestOtp = async (targetEmail) => {
    const emailToUse = (typeof targetEmail === 'string' ? targetEmail : email).trim();
    if (!emailToUse) {
      return setError('Please enter your registered email address');
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: emailToUse });
      if (res.data.sandboxOtp) {
        setSandboxOtp(res.data.sandboxOtp);
      }
      if (res.data.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      }
      setEmailSentLive(Boolean(res.data.emailSent));
      setSuccessMsg('A 6-digit verification code has been dispatched.');
      setStep(2);
      setTimer(60);
      setCanResend(false);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Changes Handler
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newOtp = [...otpValues];
      newOtp[index] = '';
      setOtpValues(newOtp);
      return;
    }

    // Single digit input
    const newOtp = [...otpValues];
    newOtp[index] = cleanVal.substring(cleanVal.length - 1);
    setOtpValues(newOtp);

    // Auto-focus next input
    if (index < 5 && cleanVal) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // OTP Keydown (Backspace navigation & Enter submit)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullOtp = otpValues.join('');
      if (fullOtp.length === 6) {
        handleVerifyOtp();
      }
    }
  };

  // OTP Paste Handler
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pastedData.length >= 6) {
      const newOtp = pastedData.substring(0, 6).split('');
      setOtpValues(newOtp);
      otpInputsRef.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpValues.join('').trim();
    if (fullOtp.length !== 6) {
      return setError('Please enter the complete 6-digit OTP code');
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        email: email.trim(),
        otp: fullOtp
      });
      setResetToken(res.data.resetToken);
      setSuccessMsg('OTP verified successfully.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/resend-otp', { email: email.trim() });
      if (res.data.sandboxOtp) {
        setSandboxOtp(res.data.sandboxOtp);
      }
      if (res.data.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      }
      setEmailSentLive(Boolean(res.data.emailSent));
      setTimer(60);
      setCanResend(false);
      setOtpValues(['', '', '', '', '', '']);
      setSuccessMsg('A new 6-digit OTP code has been dispatched.');
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Copy helper OTP to inputs
  const handleApplySandboxOtp = (code) => {
    if (!code) return;
    const digits = String(code).split('').slice(0, 6);
    setOtpValues(digits);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
    otpInputsRef.current[5]?.focus();
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        resetToken,
        newPassword
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please restart the process.');
    } finally {
      setLoading(false);
    }
  };

  // Password Strength Calculation
  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[A-Z]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score; // 0 to 4
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
            <KeyRound className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Verification Code'}
            {step === 3 && 'Create New Password'}
            {step === 4 && 'Password Reset Complete'}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {step === 1 && 'Enter your account email to receive a secure 6-digit OTP'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Choose a strong and secure password for your account'}
            {step === 4 && 'Your password has been updated and is ready to use'}
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 p-6 sm:p-8 rounded-3xl shadow-2xl">
          {/* Global Alert Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            {successMsg && step === 2 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleRequestOtp(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm sm:text-base"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Send size={18} />
                    <span>Send 6-Digit OTP Code</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Verification & Interactive Helper */}
          {step === 2 && (
            <div className="space-y-6">
              {/* 6 Digit Boxes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 text-center mb-3">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-2xl font-bold bg-slate-800/80 border rounded-2xl text-white outline-none transition-all ${
                        digit
                          ? 'border-indigo-500 shadow-md shadow-indigo-500/20 bg-slate-800 ring-2 ring-indigo-500/30'
                          : 'border-slate-700/60 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otpValues.join('').length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Check size={18} />
                    <span>Verify Code & Proceed</span>
                  </>
                )}
              </button>

              {/* Resend Timer & Action */}
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-400" />
                  <span>Code valid for 15 minutes</span>
                </div>
                <div>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      Resend Code Now
                    </button>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      Resend available in <strong className="text-indigo-400">{timer}s</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Guide Panel */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-2xl p-4 sm:p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Inbox size={16} className="text-indigo-400" />
                    <span>Where to Find Your OTP Code</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                    Delivery Guide
                  </span>
                </div>

                {/* Guide Navigation Tabs */}
                <div className="grid grid-cols-3 gap-1.5 mb-4 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('spam')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeGuideTab === 'spam'
                        ? 'bg-amber-500 text-slate-950 shadow font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    <span>Spam Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('inbox')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeGuideTab === 'inbox'
                        ? 'bg-indigo-600 text-white shadow font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Inbox size={13} />
                    <span>Primary Inbox</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('promotions')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeGuideTab === 'promotions'
                        ? 'bg-purple-600 text-white shadow font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>All Mail / Tabs</span>
                  </button>
                </div>

                {/* Guide Tab Content with Motion */}
                <AnimatePresence mode="wait">
                  {activeGuideTab === 'spam' && (
                    <motion.div
                      key="tab-spam"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-slate-300 space-y-2"
                    >
                      <div className="flex items-start gap-2 text-amber-300 font-bold">
                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                        <span>High Priority: Check Spam & Junk Folder</span>
                      </div>
                      <p className="leading-relaxed text-slate-300">
                        Major mail providers (Gmail, Outlook, Yahoo) often categorize automated security codes and OTP emails into your <strong>Spam</strong> or <strong>Junk</strong> directory.
                      </p>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <div>1. Open your mail client and expand the sidebar (Click "More").</div>
                        <div>2. Select <strong>Spam / Junk</strong> folder.</div>
                        <div>3. Open the email from <strong>Attendly Security</strong> and click <strong>"Not Spam"</strong> or <strong>"Move to Inbox"</strong>.</div>
                      </div>
                    </motion.div>
                  )}

                  {activeGuideTab === 'inbox' && (
                    <motion.div
                      key="tab-inbox"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-slate-300 space-y-2"
                    >
                      <div className="flex items-start gap-2 text-indigo-300 font-bold">
                        <Inbox size={16} className="shrink-0 mt-0.5" />
                        <span>Look for Email from Attendly Security</span>
                      </div>
                      <p className="leading-relaxed">
                        Search your inbox for <strong>"Attendly Security"</strong> or subject <strong>"Your Password Reset OTP"</strong>. Delivery typically takes less than 1 minute.
                      </p>
                    </motion.div>
                  )}

                  {activeGuideTab === 'promotions' && (
                    <motion.div
                      key="tab-promotions"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3.5 text-xs text-slate-300 space-y-2"
                    >
                      <div className="flex items-start gap-2 text-purple-300 font-bold">
                        <Layers size={16} className="shrink-0 mt-0.5" />
                        <span>Check Categorized Tabs & All Mail</span>
                      </div>
                      <p className="leading-relaxed">
                        In Gmail or Outlook, automated notifications may be organized under the <strong>Updates</strong>, <strong>Promotions</strong>, or <strong>All Mail</strong> view.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Back */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  Change Email
                </button>

                <Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <AnimatedPasswordInput
                  label="New Password"
                  name="newPassword"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Strength:</span>
                      <span className={`font-bold ${
                        passwordStrength <= 1 ? 'text-rose-400' :
                        passwordStrength === 2 ? 'text-amber-400' :
                        passwordStrength === 3 ? 'text-indigo-400' : 'text-emerald-400'
                      }`}>
                        {passwordStrength <= 1 && 'Weak'}
                        {passwordStrength === 2 && 'Fair'}
                        {passwordStrength === 3 && 'Good'}
                        {passwordStrength === 4 && 'Strong'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${passwordStrength >= 1 ? (passwordStrength === 1 ? 'bg-rose-500' : passwordStrength === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-700'}`} />
                      <div className={`h-full rounded-full transition-all ${passwordStrength >= 2 ? (passwordStrength === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-700'}`} />
                      <div className={`h-full rounded-full transition-all ${passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      <div className={`h-full rounded-full transition-all ${passwordStrength >= 4 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <AnimatedPasswordInput
                  label="Confirm New Password"
                  name="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Check size={18} />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: Success & Completion */}
          {step === 4 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 size={42} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Password Updated!</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Your password has been successfully reset. You can now use your new password to sign into your account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <span>Sign In Now</span>
                <ArrowLeft className="rotate-180" size={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
