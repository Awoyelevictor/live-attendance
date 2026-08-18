import { useState, useEffect, useRef, useId } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';

// Character set used for the cryptographic scramble / cipher animation
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

export default function AnimatedPasswordInput({
  label,
  value,
  onChange,
  name = 'password',
  id: customId,
  placeholder = '••••••••',
  required = false,
  className = '',
  inputClassName = '',
  disabled = false,
  error,
  autoComplete = 'current-password',
  register, // For react-hook-form: {...register('fieldName')}
  rightHeader, // e.g. "Forgot Password?" link
  icon: Icon = Lock,
  strengthMeter = false
}) {
  const generatedId = useId().replace(/:/g, '');
  const inputId = customId || `password-input-${generatedId}`;
  const maskOpenId = `eye-open-mask-${generatedId}`;
  const maskClosedId = `eye-closed-mask-${generatedId}`;
  const clipId = `eye-clip-${generatedId}`;

  // Internal visibility state
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayText, setDisplayText] = useState('');
  
  // Eye pupil tracking & blinking state
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  
  const inputRef = useRef(null);
  const eyeBtnRef = useRef(null);
  const animationFrameRef = useRef(null);
  const resetTimerRef = useRef(null);

  // Pointer tracking for the eyeball pupil
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!eyeBtnRef.current) return;
      
      const rect = eyeBtnRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      // Map distance into clamp range for 24x24 viewBox (max radius ~3px)
      const maxRadius = 3.0;
      const radius = Math.min(maxRadius, (distance / 240) * maxRadius);
      
      const targetX = Math.cos(angle) * radius;
      const targetY = Math.sin(angle) * radius;

      setEyeOffset({ x: targetX, y: targetY });

      // If pointer is idle, smoothly reset eye after 2 seconds
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setEyeOffset({ x: 0, y: 0 });
      }, 2000);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Organic random blinking loop
  useEffect(() => {
    let timeoutId;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 4000 + 2500; // 2.5s to 6.5s
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // 30% chance of double-blink
          if (Math.random() > 0.7) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => {
                setIsBlinking(false);
                scheduleNextBlink();
              }, 90);
            }, 120);
          } else {
            scheduleNextBlink();
          }
        }, 110);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // Read current input value whether controlled or uncontrolled
  const getInputValue = () => {
    if (value !== undefined && value !== null) return String(value);
    if (inputRef.current) return inputRef.current.value || '';
    return '';
  };

  // Scramble text animation logic when toggling reveal/hide
  const toggleVisibility = () => {
    if (isAnimating) return;
    
    const targetIsRevealed = !isRevealed;
    const currentVal = getInputValue();
    
    if (!currentVal) {
      setIsRevealed(targetIsRevealed);
      return;
    }

    setIsAnimating(true);
    const duration = 450; // ms
    const startTime = performance.now();
    const len = currentVal.length;

    // Trigger an eye blink/wink reaction
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 140);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (targetIsRevealed) {
        // Scramble from dots into real plaintext
        let result = '';
        for (let i = 0; i < len; i++) {
          const charThreshold = (i + 1) / len;
          if (progress >= charThreshold) {
            // Decrypted character
            result += currentVal[i];
          } else if (progress >= charThreshold - 0.4) {
            // Scrambling cipher glyph
            const randomChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            result += randomChar;
          } else {
            // Still masked
            result += '•';
          }
        }
        setDisplayText(result);
      } else {
        // Scramble from plaintext back into dots
        let result = '';
        for (let i = 0; i < len; i++) {
          const charThreshold = (i + 1) / len;
          if (progress >= charThreshold) {
            // Encrypted back into dot
            result += '•';
          } else if (progress >= charThreshold - 0.4) {
            // Scrambling cipher glyph
            const randomChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            result += randomChar;
          } else {
            // Still plain
            result += currentVal[i];
          }
        }
        setDisplayText(result);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsRevealed(targetIsRevealed);
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Upper lid morph paths:
  // Open lid: "M1 12C1 12 5 4 12 4C19 4 23 12 23 12"
  // Closed/Blink lid: "M1 12C1 12 5 20 12 20C19 20 23 12 23 12"
  const isEyeClosed = isBlinking || (!isRevealed && isAnimating);
  const upperLidD = isEyeClosed
    ? 'M1 12C1 12 5 20 12 20C19 20 23 12 23 12'
    : 'M1 12C1 12 5 4 12 4C19 4 23 12 23 12';
  
  // Clip path polygon for eyeball
  const clipD = isEyeClosed
    ? 'M1 12C1 12 5 20 12 20C19 20 23 12 23 12C19 20 5 20 1 12Z'
    : 'M1 12C1 12 5 4 12 4C19 4 23 12 23 12C19 20 5 20 1 12Z';

  // Handle standard input change
  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
    if (register && register.onChange) {
      register.onChange(e);
    }
  };

  // Combined ref handler to support both internal ref and react-hook-form
  const setCombinedRef = (node) => {
    inputRef.current = node;
    if (register && register.ref) {
      if (typeof register.ref === 'function') {
        register.ref(node);
      } else {
        register.ref.current = node;
      }
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Label and Optional Right Action */}
      {(label || rightHeader) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-medium text-slate-400">
              {label}
            </label>
          )}
          {rightHeader && <div>{rightHeader}</div>}
        </div>
      )}

      {/* Input Field Container */}
      <div className="relative group">
        {/* Optional Left Icon */}
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10">
            <Icon size={18} />
          </div>
        )}

        {/* The Native / Animated Input */}
        <input
          {...(register || {})}
          ref={setCombinedRef}
          id={inputId}
          name={name}
          type={isAnimating ? 'text' : (isRevealed ? 'text' : 'password')}
          value={isAnimating ? displayText : (value !== undefined ? value : undefined)}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full bg-slate-800/50 border ${
            error ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-slate-700/50 focus:border-indigo-500/70 focus:ring-indigo-500/40'
          } rounded-xl py-3.5 ${Icon ? 'pl-12' : 'pl-4'} pr-12 text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:ring-2 transition-all text-sm sm:text-base ${inputClassName}`}
        />

        {/* Interactive Eyeball Reveal Toggle Button */}
        <button
          ref={eyeBtnRef}
          type="button"
          onClick={toggleVisibility}
          disabled={disabled}
          title={isRevealed ? 'Hide password' : 'Reveal password'}
          aria-pressed={isRevealed}
          aria-label={isRevealed ? 'Hide password' : 'Reveal password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all z-10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 pointer-events-none"
          >
            <defs>
              <clipPath id={clipId}>
                <motion.path
                  animate={{ d: clipD }}
                  transition={{ duration: 0.12, ease: 'easeInOut' }}
                />
              </clipPath>
            </defs>

            {/* Upper Eyelid Line */}
            <motion.path
              className="lid lid--upper"
              animate={{ d: upperLidD }}
              transition={{ duration: 0.12, ease: 'easeInOut' }}
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Lower Eyelid Line */}
            <path
              className="lid lid--lower"
              d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Eyeball & Pupil with Pointer Tracking inside Clip Path */}
            <g clipPath={`url(#${clipId})`}>
              <motion.g
                animate={{
                  x: eyeOffset.x,
                  y: eyeOffset.y
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  mass: 0.5
                }}
              >
                {/* Iris & Pupil */}
                <circle cy="12" cx="12" r="3.8" fill="currentColor" />
                {/* Specular White Glint */}
                <circle cy="10.8" cx="13.2" r="1.1" fill="#ffffff" />
              </motion.g>
            </g>
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}
