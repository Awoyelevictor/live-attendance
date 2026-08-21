import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function CustomAudioPlayer({ src, isMine }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [objectUrl, setObjectUrl] = useState('');

  // 1. Extract and set duration from hash parameter immediately if present
  useEffect(() => {
    if (src && src.includes('#duration=')) {
      const parts = src.split('#duration=');
      const parsedDuration = parseFloat(parts[1]);
      if (!isNaN(parsedDuration) && isFinite(parsedDuration)) {
        setDuration(parsedDuration);
      }
    }
  }, [src]);

  // 2. Convert base64 source into a Blob URL to allow seeking, metadata loading, and native playback
  useEffect(() => {
    if (!src) return;
    
    let activeUrl = src;
    let revokeUrl = null;

    if (src.startsWith('data:')) {
      try {
        const base64Data = src.split('#')[0];
        const arr = base64Data.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
        
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        
        const blob = new Blob([u8arr], { type: mime });
        const localUrl = URL.createObjectURL(blob);
        activeUrl = localUrl;
        revokeUrl = localUrl;
      } catch (err) {
        console.error('Failed to convert base64 audio to object URL:', err);
      }
    }

    setObjectUrl(activeUrl);

    return () => {
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
      }
    };
  }, [src]);

  // 3. Audio tag event listeners and lifecycle tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else if (src && src.includes('#duration=')) {
        const parts = src.split('#duration=');
        const parsedDuration = parseFloat(parts[1]);
        if (!isNaN(parsedDuration) && isFinite(parsedDuration)) {
          setDuration(parsedDuration);
        }
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Initial check in case it's already loaded
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    } else if (src && src.includes('#duration=')) {
      const parts = src.split('#duration=');
      const parsedDuration = parseFloat(parts[1]);
      if (!isNaN(parsedDuration) && isFinite(parsedDuration)) {
        setDuration(parsedDuration);
      }
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [objectUrl, src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error("Audio playback failed", err));
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`flex items-center gap-3 p-2.5 rounded-xl w-72 max-w-full shadow-inner ${
        isMine 
          ? 'bg-indigo-950/40 text-indigo-100 border border-indigo-500/15' 
          : 'bg-slate-900/80 text-slate-100 border border-slate-800'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={objectUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
          isMine
            ? 'bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
        }`}
      >
        {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Progress slider & timings */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-0"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`
            }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-medium tracking-wide">
          <span className={isMine ? 'text-indigo-300' : 'text-slate-400'}>
            {formatTime(currentTime)}
          </span>
          <span className={isMine ? 'text-indigo-300' : 'text-slate-400'}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume controller button */}
      <button
        onClick={toggleMute}
        className={`p-1.5 rounded-lg transition-colors ${
          isMine 
            ? 'hover:bg-indigo-500/10 text-indigo-300 hover:text-indigo-100' 
            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}
