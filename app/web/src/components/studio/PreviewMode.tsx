'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Footprints, Pause, Play } from 'lucide-react';
import type { Overlay } from '@/lib/stores/overlay-store';

interface PreviewModeProps {
  overlays: Overlay[];
  onExit: () => void;
}

export function PreviewMode({ overlays, onExit }: PreviewModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMotionPermission, setHasMotionPermission] = useState(false);
  const [showMotionPrompt, setShowMotionPrompt] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Motion detection state
  const motionData = useRef({
    lastMagnitude: 9.81,
    walkingSamples: 0,
    stoppedSamples: 0,
  });

  // Request motion permission (iOS requires gesture)
  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        'requestPermission' in DeviceMotionEvent) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setHasMotionPermission(true);
          setShowMotionPrompt(false);
          startMotionDetection();
        }
      } catch (e) {
        console.error('Motion permission denied:', e);
        setShowMotionPrompt(false);
      }
    } else {
      // Non-iOS or older browser
      setHasMotionPermission(true);
      setShowMotionPrompt(false);
      startMotionDetection();
    }
  };

  // Motion detection algorithm
  const startMotionDetection = useCallback(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const deviation = Math.abs(magnitude - 9.81);

      // Walking detection thresholds
      const WALK_THRESHOLD = 0.3;
      const SUSTAINED_SAMPLES = 75; // ~1.5s at 50Hz
      const STOPPED_SAMPLES = 100; // ~2s at 50Hz

      if (deviation > WALK_THRESHOLD) {
        motionData.current.walkingSamples++;
        motionData.current.stoppedSamples = 0;

        if (motionData.current.walkingSamples >= SUSTAINED_SAMPLES && !isWalking) {
          setIsWalking(true);
        }
      } else {
        motionData.current.stoppedSamples++;
        motionData.current.walkingSamples = 0;

        if (motionData.current.stoppedSamples >= STOPPED_SAMPLES && isWalking) {
          setIsWalking(false);
        }
      }

      motionData.current.lastMagnitude = magnitude;
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isWalking]);

  // Sync video playback with walking state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasMotionPermission) return;

    if (isWalking && !isPlaying) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (!isWalking && isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
  }, [isWalking, isPlaying, hasMotionPermission]);

  // Get visible overlays
  const visibleOverlays = overlays.filter(
    o => currentTime >= o.timing.startTime && currentTime <= o.timing.endTime
  );

  // Text-to-speech for current overlay
  useEffect(() => {
    if (isMuted) return;

    visibleOverlays.forEach(overlay => {
      const ttsText = overlay.ttsContent?.[currentLanguage] || overlay.ttsContent?.en;
      if (ttsText && 'speechSynthesis' in window) {
        // Only speak when overlay first appears
        const utterance = new SpeechSynthesisUtterance(ttsText);
        utterance.lang = currentLanguage;
        utterance.rate = 0.9;
        // speechSynthesis.speak(utterance); // Commented for demo
      }
    });
  }, [visibleOverlays.map(o => o.id).join(',')]);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: string) => {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<string, number[]> = {
      'turn-left': [100, 50, 100],
      'turn-right': [200],
      'straight': [50],
      'arrived': [100, 50, 100, 50, 100],
      'warning': [300, 100, 300],
      'attention': [100, 100, 100],
    };

    navigator.vibrate(patterns[pattern] || [100]);
  }, []);

  useEffect(() => {
    visibleOverlays.forEach(overlay => {
      if (overlay.haptic) {
        triggerHaptic(overlay.haptic);
      }
    });
  }, [visibleOverlays.map(o => o.id).join(','), triggerHaptic]);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src="/demo/navigation-demo.mp4" type="video/mp4" />
      </video>

      {/* Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {visibleOverlays.map(overlay => (
            <OverlayDisplay 
              key={overlay.id} 
              overlay={overlay} 
              currentTime={currentTime}
              language={currentLanguage}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Motion Prompt */}
      <AnimatePresence>
        {showMotionPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center p-8"
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
                Motion-Controlled Playback
              </h2>
              <p className="text-text-secondary mb-6">
                Walk to play the video. Stop walking and the video pauses. 
                This creates an immersive navigation experience.
              </p>
              <button
                onClick={requestMotionPermission}
                className="btn-neon px-8 py-3"
              >
                Enable Motion Detection
              </button>
              <button
                onClick={() => setShowMotionPrompt(false)}
                className="block mx-auto mt-4 text-sm text-text-tertiary hover:text-text-secondary"
              >
                Skip (use manual controls)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* Walking Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isWalking ? 'bg-neon-green animate-pulse' : 'bg-text-tertiary'}`} />
            <span className="text-sm text-white">
              {isWalking ? 'Walking...' : 'Stopped'}
            </span>
          </div>

          {/* Manual Controls */}
          <div className="flex items-center gap-4">
            {!hasMotionPermission && (
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    if (isPlaying) {
                      video.pause();
                    } else {
                      video.play();
                    }
                  }
                }}
                className="p-2 bg-white/20 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-white/20 rounded-full"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Language Selector */}
      <div className="absolute top-4 left-4 flex gap-1">
        {['en', 'es', 'fr'].map(lang => (
          <button
            key={lang}
            onClick={() => setCurrentLanguage(lang)}
            className={`px-3 py-1 text-xs rounded-full transition ${
              currentLanguage === lang
                ? 'bg-neon-cyan text-black'
                : 'bg-black/50 text-white'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Overlay Display Component
function OverlayDisplay({ 
  overlay, 
  currentTime,
  language 
}: { 
  overlay: Overlay; 
  currentTime: number;
  language: string;
}) {
  const { timing, position, type } = overlay;

  // Calculate fade opacity
  let opacity = 1;
  const fadeInEnd = timing.startTime + (timing.fadeIn || 200) / 1000;
  const fadeOutStart = timing.endTime - (timing.fadeOut || 200) / 1000;

  if (currentTime < fadeInEnd) {
    opacity = (currentTime - timing.startTime) / ((timing.fadeIn || 200) / 1000);
  } else if (currentTime > fadeOutStart) {
    opacity = (timing.endTime - currentTime) / ((timing.fadeOut || 200) / 1000);
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
        transform: `translate(-50%, -50%) scale(${position.scale || 1}) rotate(${position.rotation || 0}deg)`,
      }}
    >
      {type === 'arrow' && <ArrowPreview overlay={overlay} />}
      {type === 'text' && <TextPreview overlay={overlay} content={content} />}
      {type === 'destination' && <DestinationPreview overlay={overlay} content={content} />}
      {type === 'warning' && <WarningPreview overlay={overlay} content={content} />}
      {type === 'landmark' && <LandmarkPreview overlay={overlay} content={content} />}
    </motion.div>
  );
}

function ArrowPreview({ overlay }: { overlay: Overlay }) {
  const arrows: Record<string, string> = {
    'straight': '↑',
    'left': '←',
    'right': '→',
    'slight-left': '↖',
    'slight-right': '↗',
    'u-turn': '↩',
    'up-stairs': '⬆',
    'down-stairs': '⬇',
    'elevator': '🛗',
    'escalator': '↗',
  };

  return (
    <motion.div 
      className="flex flex-col items-center"
      animate={{ y: [0, -5, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      <div className="w-20 h-20 rounded-full bg-neon-cyan/30 backdrop-blur-sm border-2 border-neon-cyan flex items-center justify-center shadow-lg shadow-neon-cyan/50">
        <span className="text-5xl text-neon-cyan">
          {arrows[overlay.direction || 'straight']}
        </span>
      </div>
      {overlay.distance && (
        <span className="mt-2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-white font-mono">
          {overlay.distance}m
        </span>
      )}
    </motion.div>
  );
}

function TextPreview({ overlay, content }: { overlay: Overlay; content?: string }) {
  const title = overlay.title?.en;
  
  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-xl px-5 py-4 max-w-xs border border-white/20 shadow-xl">
      {title && (
        <h4 className="text-base font-heading font-bold text-neon-cyan mb-1">{title}</h4>
      )}
      <p className="text-base text-white">{content}</p>
    </div>
  );
}

function DestinationPreview({ overlay, content }: { overlay: Overlay; content?: string }) {
  return (
    <motion.div 
      className="flex flex-col items-center"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <div className="w-24 h-24 rounded-full bg-neon-green/30 border-4 border-neon-green flex items-center justify-center shadow-lg shadow-neon-green/50">
        <span className="text-5xl">✓</span>
      </div>
      <div className="mt-3 px-4 py-2 bg-neon-green text-black font-heading font-bold rounded-full text-lg">
        {overlay.arrived ? 'Arrived!' : content}
      </div>
    </motion.div>
  );
}

function WarningPreview({ overlay, content }: { overlay: Overlay; content?: string }) {
  const colors: Record<string, string> = {
    'info': 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan',
    'caution': 'border-yellow-400 bg-yellow-400/20 text-yellow-400',
    'warning': 'border-neon-orange bg-neon-orange/20 text-neon-orange',
    'danger': 'border-red-500 bg-red-500/20 text-red-500',
  };

  return (
    <motion.div 
      className={`rounded-xl px-5 py-3 border-2 ${colors[overlay.severity || 'info']} backdrop-blur-sm`}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      <p className="text-base font-bold">{content}</p>
    </motion.div>
  );
}

function LandmarkPreview({ overlay, content }: { overlay: Overlay; content?: string }) {
  const icons: Record<string, string> = {
    'restroom': '🚻',
    'elevator': '🛗',
    'exit': '🚪',
    'info': 'ℹ️',
    'food': '🍽️',
    'shop': '🛍️',
    'medical': '🏥',
    'custom': '📍',
  };

  return (
    <div className="flex items-center gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2.5 border border-white/20 shadow-lg">
      <span className="text-2xl">{icons[overlay.category || 'info']}</span>
      <span className="text-base text-white font-medium">{content}</span>
    </div>
  );
}
