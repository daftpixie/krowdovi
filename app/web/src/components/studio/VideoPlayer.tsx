'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  hlsSrc?: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export function VideoPlayer({
  src,
  hlsSrc,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoSrc = hlsSrc || src;
    if (!videoSrc) return;

    // Check if HLS is needed and supported
    if (hlsSrc && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(hlsSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS error:', data);
          // Fallback to direct source if available
          if (src) {
            video.src = src;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && hlsSrc) {
      // Native HLS support (Safari)
      video.src = hlsSrc;
      setIsLoading(false);
    } else if (src) {
      // Direct source
      video.src = src;
      setIsLoading(false);
    }
  }, [src, hlsSrc]);

  // Sync play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        onPlayStateChange(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Sync time from external
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only seek if difference is significant (>0.5s)
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  // Handle video events
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      onTimeUpdate(video.currentTime);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      onDurationChange(video.duration);
      setIsLoading(false);
    }
  }, [onDurationChange]);

  const togglePlay = useCallback(() => {
    onPlayStateChange(!isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.requestFullscreen();
      }
    }
  }, []);

  return (
    <div 
      className="relative w-full h-full bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => onPlayStateChange(true)}
        onPause={() => onPlayStateChange(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Center Play Button */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </button>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="p-2 hover:bg-white/20 rounded transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={toggleMute}
            className="p-2 hover:bg-white/20 rounded transition"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-white/20 rounded transition"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Demo Placeholder */}
      {!src && !hlsSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-neon-cyan/20 flex items-center justify-center">
              <Play className="w-12 h-12 text-neon-cyan" />
            </div>
            <p className="text-text-secondary font-heading">
              Upload a video to get started
            </p>
            <p className="text-sm text-text-tertiary mt-2">
              Record a first-person walking video of your navigation route
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
