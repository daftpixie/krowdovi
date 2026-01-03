'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import { 
  ArrowLeft, Volume2, VolumeX, Star, Share2, 
  Footprints, AlertCircle, Check, Languages 
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Overlay {
  id: string;
  type: string;
  position: { x: number; y: number; scale: number; rotation: number };
  timing: { startTime: number; endTime: number; fadeIn: number; fadeOut: number };
  direction?: string;
  distance?: number;
  content?: Record<string, string>;
  title?: Record<string, string>;
  ttsContent?: Record<string, string>;
  haptic?: string;
  severity?: string;
  category?: string;
  arrived?: boolean;
}

export default function NavigatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params?.id as string;
  const accessMethod = (searchParams?.get('via') || 'LINK') as 'NFC' | 'QR' | 'LINK' | 'APP';

  // State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<any>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User preferences
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  // Motion detection
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [showMotionPrompt, setShowMotionPrompt] = useState(true);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  // Motion detection refs
  const motionData = useRef({
    samples: [] as number[],
    walkingCount: 0,
    stoppedCount: 0,
  });

  // Fetch video and overlays
  useEffect(() => {
    if (!videoId) return;

    const fetchData = async () => {
      try {
        const [videoRes, overlaysRes] = await Promise.all([
          api.getVideo(videoId),
          api.getOverlays(videoId),
        ]);

        if (videoRes.success && videoRes.data) {
          setVideo(videoRes.data.video);
        } else {
          setError('Video not found');
        }

        if (overlaysRes.success && overlaysRes.data) {
          setOverlays(overlaysRes.data.overlays);
        }

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load video');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [videoId]);

  // Start session
  useEffect(() => {
    if (!video || sessionId) return;

    const startSession = async () => {
      const res = await api.startSession({
        videoId: video.id,
        venueId: video.venueId,
        accessMethod,
        platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        hasMotion: typeof DeviceMotionEvent !== 'undefined',
        hasHaptics: typeof navigator !== 'undefined' && 'vibrate' in navigator,
        hasTts: typeof window !== 'undefined' && 'speechSynthesis' in window,
      });

      if (res.success && res.data) {
        setSessionId(res.data.session.id);
      }
    };

    startSession();
  }, [video, sessionId, accessMethod]);

  // Initialize HLS
  useEffect(() => {
    if (!video || !videoRef.current) return;

    const videoEl = videoRef.current;
    const hlsUrl = video.hlsUrl;

    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
      return () => hls.destroy();
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl') && hlsUrl) {
      videoEl.src = hlsUrl;
    }
  }, [video]);

  // Track completion
  useEffect(() => {
    if (!duration) return;
    const percent = Math.round((currentTime / duration) * 100);
    setCompletionPercent(percent);

    // Update session every 10%
    if (sessionId && percent % 10 === 0 && percent > 0) {
      api.updateSession(sessionId, { completionPercent: percent });
    }

    // Show rating at 90%+
    if (percent >= 90 && !hasCompleted) {
      setHasCompleted(true);
      if (sessionId) {
        api.endSession(sessionId, percent);
      }
      setTimeout(() => setShowRating(true), 1000);
    }
  }, [currentTime, duration, sessionId, hasCompleted]);

  // Motion detection
  const handleMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setMotionEnabled(true);
          setShowMotionPrompt(false);
          startMotionDetection();
        }
      } catch (e) {
        setShowMotionPrompt(false);
      }
    } else {
      setMotionEnabled(true);
      setShowMotionPrompt(false);
      startMotionDetection();
    }
  };

  const startMotionDetection = useCallback(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const samples = motionData.current.samples;
      samples.push(magnitude);
      if (samples.length > 10) samples.shift();

      const avgMag = samples.reduce((a, b) => a + b, 0) / samples.length;
      const deviation = Math.abs(avgMag - 9.81);

      if (deviation > 0.3) {
        motionData.current.walkingCount++;
        motionData.current.stoppedCount = 0;
        if (motionData.current.walkingCount >= 75) setIsWalking(true);
      } else {
        motionData.current.stoppedCount++;
        motionData.current.walkingCount = 0;
        if (motionData.current.stoppedCount >= 100) setIsWalking(false);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  // Sync video with walking state
  useEffect(() => {
    if (!motionEnabled || !videoRef.current) return;
    if (isWalking && !isPlaying) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (!isWalking && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isWalking, isPlaying, motionEnabled]);

  // Text-to-speech
  const speakText = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }, [isMuted, language]);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: string) => {
    if (!('vibrate' in navigator)) return;
    const patterns: Record<string, number[]> = {
      'turn-left': [100, 50, 100],
      'turn-right': [200],
      'straight': [50],
      'arrived': [100, 50, 100, 50, 100],
      'warning': [300, 100, 300],
    };
    navigator.vibrate(patterns[pattern] || [100]);
  }, []);

  // Get visible overlays
  const visibleOverlays = overlays.filter(
    o => currentTime >= o.timing.startTime && currentTime <= o.timing.endTime
  );

  // Process overlay effects
  useEffect(() => {
    visibleOverlays.forEach(overlay => {
      // Only trigger once per overlay appearance
      const tts = overlay.ttsContent?.[language] || overlay.ttsContent?.en;
      if (tts && Math.abs(currentTime - overlay.timing.startTime) < 0.1) {
        speakText(tts);
      }
      if (overlay.haptic && Math.abs(currentTime - overlay.timing.startTime) < 0.1) {
        triggerHaptic(overlay.haptic);
      }
    });
  }, [visibleOverlays.map(o => o.id).join(',')]);

  // Submit rating
  const submitRating = async (stars: number) => {
    setRating(stars);
    if (videoId) {
      await api.rateVideo(videoId, stars);
    }
    setTimeout(() => setShowRating(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-bg-deepest flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading navigation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-bg-deepest flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-neon-orange mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-text-primary mb-2">
            {error}
          </h1>
          <p className="text-text-secondary mb-6">
            This navigation video couldn't be loaded.
          </p>
          <Link href="/" className="btn-neon px-6 py-3 inline-block">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={() => {
          if (!motionEnabled) {
            if (isPlaying) videoRef.current?.pause();
            else videoRef.current?.play();
          }
        }}
      />

      {/* Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {visibleOverlays.map(overlay => (
            <OverlayRenderer
              key={overlay.id}
              overlay={overlay}
              currentTime={currentTime}
              language={language}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-2 bg-black/30 rounded-full backdrop-blur">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="p-2 bg-black/30 rounded-full backdrop-blur"
              >
                <Languages className="w-5 h-5 text-white" />
              </button>
              {showLanguageMenu && (
                <div className="absolute right-0 top-12 bg-surface-1 rounded-lg shadow-xl overflow-hidden">
                  {['en', 'es', 'fr', 'de', 'zh', 'ja'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm',
                        language === lang ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white hover:bg-white/10'
                      )}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-black/30 rounded-full backdrop-blur"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            
            {/* Share */}
            <button
              onClick={() => navigator.share?.({ url: window.location.href })}
              className="p-2 bg-black/30 rounded-full backdrop-blur"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Progress */}
        <div className="h-1 bg-white/20 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-neon-cyan"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        
        {/* Info */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              {video?.title || 'Navigation'}
            </h2>
            <p className="text-sm text-white/70">
              {video?.route?.startLocation} → {video?.route?.endLocation}
            </p>
          </div>
          
          {motionEnabled && (
            <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full',
                isWalking ? 'bg-neon-green animate-pulse' : 'bg-text-tertiary'
              )} />
              <span className="text-xs text-white">
                {isWalking ? 'Walking' : 'Stopped'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Motion Permission Prompt */}
      <AnimatePresence>
        {showMotionPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center p-8 z-50"
          >
            <div className="max-w-sm text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-24 h-24 mx-auto mb-6 bg-neon-cyan/20 rounded-full flex items-center justify-center"
              >
                <Footprints className="w-12 h-12 text-neon-cyan" />
              </motion.div>
              <h2 className="text-xl font-heading font-bold text-white mb-3">
                Walk to Navigate
              </h2>
              <p className="text-text-secondary mb-6">
                Video plays when you walk, pauses when you stop. Like having a personal guide!
              </p>
              <button onClick={handleMotionPermission} className="btn-neon px-8 py-3 w-full mb-3">
                Enable Motion Detection
              </button>
              <button
                onClick={() => setShowMotionPrompt(false)}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Skip (tap to play/pause)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center p-8 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              {rating ? (
                <>
                  <Check className="w-16 h-16 text-neon-green mx-auto mb-4" />
                  <h2 className="text-xl font-heading font-bold text-white">
                    Thanks for rating!
                  </h2>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-heading font-bold text-white mb-4">
                    How was this navigation?
                  </h2>
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => submitRating(star)}
                        className="p-2 hover:scale-110 transition"
                      >
                        <Star className="w-10 h-10 text-neon-yellow fill-neon-yellow/20" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowRating(false)}
                    className="text-sm text-text-tertiary"
                  >
                    Skip
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Overlay Renderer
function OverlayRenderer({
  overlay,
  currentTime,
  language,
}: {
  overlay: Overlay;
  currentTime: number;
  language: string;
}) {
  const { timing, position, type } = overlay;

  // Fade opacity
  let opacity = 1;
  const fadeInEnd = timing.startTime + timing.fadeIn / 1000;
  const fadeOutStart = timing.endTime - timing.fadeOut / 1000;

  if (currentTime < fadeInEnd) {
    opacity = (currentTime - timing.startTime) / (timing.fadeIn / 1000);
  } else if (currentTime > fadeOutStart) {
    opacity = (timing.endTime - currentTime) / (timing.fadeOut / 1000);
  }

  const content = overlay.content?.[language] || overlay.content?.en;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: Math.max(0, Math.min(1, opacity)), scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${position.scale}) rotate(${position.rotation}deg)`,
      }}
    >
      {type === 'arrow' && <ArrowDisplay overlay={overlay} />}
      {type === 'text' && <TextDisplay content={content} title={overlay.title?.[language] || overlay.title?.en} />}
      {type === 'warning' && <WarningDisplay content={content} severity={overlay.severity} />}
      {type === 'landmark' && <LandmarkDisplay content={content} category={overlay.category} />}
      {type === 'destination' && <DestinationDisplay content={content} arrived={overlay.arrived} />}
    </motion.div>
  );
}

function ArrowDisplay({ overlay }: { overlay: Overlay }) {
  const arrows: Record<string, string> = {
    'straight': '↑', 'left': '←', 'right': '→',
    'slight-left': '↖', 'slight-right': '↗', 'u-turn': '↩',
    'up-stairs': '⬆', 'down-stairs': '⬇', 'elevator': '🛗', 'escalator': '↗',
  };

  return (
    <motion.div 
      className="flex flex-col items-center"
      animate={{ y: [0, -5, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      <div className="w-20 h-20 rounded-full bg-[#04D9FF]/30 border-2 border-[#04D9FF] flex items-center justify-center shadow-[0_0_30px_rgba(4,217,255,0.5)]">
        <span className="text-5xl text-[#04D9FF]">
          {arrows[overlay.direction || 'straight']}
        </span>
      </div>
      {overlay.distance && (
        <span className="mt-2 px-3 py-1 bg-black/70 rounded-full text-sm text-white font-mono">
          {overlay.distance}m
        </span>
      )}
    </motion.div>
  );
}

function TextDisplay({ content, title }: { content?: string; title?: string }) {
  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-xl px-5 py-4 max-w-xs border border-white/20">
      {title && <h4 className="text-base font-bold text-[#04D9FF] mb-1">{title}</h4>}
      <p className="text-base text-white">{content}</p>
    </div>
  );
}

function WarningDisplay({ content, severity }: { content?: string; severity?: string }) {
  const colors: Record<string, string> = {
    'info': 'border-[#04D9FF] bg-[#04D9FF]/20 text-[#04D9FF]',
    'caution': 'border-yellow-400 bg-yellow-400/20 text-yellow-400',
    'warning': 'border-[#FF5C00] bg-[#FF5C00]/20 text-[#FF5C00]',
    'danger': 'border-red-500 bg-red-500/20 text-red-500',
  };

  return (
    <motion.div 
      className={`rounded-xl px-5 py-3 border-2 ${colors[severity || 'info']}`}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      <p className="text-base font-bold">{content}</p>
    </motion.div>
  );
}

function LandmarkDisplay({ content, category }: { content?: string; category?: string }) {
  const icons: Record<string, string> = {
    'restroom': '🚻', 'elevator': '🛗', 'exit': '🚪', 'info': 'ℹ️',
    'food': '🍽️', 'shop': '🛍️', 'medical': '🏥', 'custom': '📍',
  };

  return (
    <div className="flex items-center gap-3 bg-black/70 rounded-full px-4 py-2.5 border border-white/20">
      <span className="text-2xl">{icons[category || 'info']}</span>
      <span className="text-base text-white font-medium">{content}</span>
    </div>
  );
}

function DestinationDisplay({ content, arrived }: { content?: string; arrived?: boolean }) {
  return (
    <motion.div 
      className="flex flex-col items-center"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <div className="w-24 h-24 rounded-full bg-[#2CFF05]/30 border-4 border-[#2CFF05] flex items-center justify-center shadow-[0_0_30px_rgba(44,255,5,0.5)]">
        <span className="text-5xl">✓</span>
      </div>
      <div className="mt-3 px-4 py-2 bg-[#2CFF05] text-black font-bold rounded-full text-lg">
        {arrived ? 'Arrived!' : content}
      </div>
    </motion.div>
  );
}
