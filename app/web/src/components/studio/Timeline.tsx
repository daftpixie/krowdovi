'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';
import type { Overlay } from '@/lib/stores/overlay-store';

interface TimelineProps {
  duration: number;
  currentTime: number;
  overlays: Overlay[];
  selectedId: string | null;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onSelectOverlay: (id: string | null) => void;
  onPlayPause: () => void;
}

export function Timeline({
  duration,
  currentTime,
  overlays,
  selectedId,
  isPlaying,
  onSeek,
  onSelectOverlay,
  onPlayPause,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Calculate timeline width based on zoom
  const timelineWidth = Math.max(duration * 50 * zoom, 100);
  const pixelsPerSecond = timelineWidth / Math.max(duration, 1);

  // Handle click on timeline to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  }, [duration, pixelsPerSecond, onSeek]);

  // Auto-scroll to follow playhead
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPlaying) return;

    const playheadPosition = currentTime * pixelsPerSecond;
    const containerWidth = container.clientWidth;
    const scrollPosition = container.scrollLeft;

    // If playhead is near the right edge, scroll
    if (playheadPosition > scrollPosition + containerWidth - 100) {
      container.scrollLeft = playheadPosition - containerWidth / 2;
    }
  }, [currentTime, pixelsPerSecond, isPlaying]);

  // Color mapping for overlay types
  const typeColors: Record<string, string> = {
    arrow: 'bg-neon-cyan',
    text: 'bg-neon-blue',
    ad: 'bg-neon-purple',
    landmark: 'bg-neon-green',
    warning: 'bg-neon-orange',
    destination: 'bg-neon-pink',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls Bar */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-white/10 bg-surface-1/50">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="p-2 hover:bg-white/10 rounded transition"
            title="Back 5s"
          >
            <SkipBack className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 hover:bg-white/10 rounded transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-neon-cyan" />
            ) : (
              <Play className="w-5 h-5 text-neon-cyan" />
            )}
          </button>
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            className="p-2 hover:bg-white/10 rounded transition"
            title="Forward 5s"
          >
            <SkipForward className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Time Display */}
        <div className="font-mono text-sm text-text-primary min-w-[120px]">
          <span className="text-neon-cyan">{formatTime(currentTime)}</span>
          <span className="text-text-tertiary"> / {formatTime(duration)}</span>
        </div>

        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-2 hover:bg-white/10 rounded transition"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4 text-text-secondary" />
          </button>
          <span className="text-xs text-text-tertiary min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-2 hover:bg-white/10 rounded transition"
            disabled={zoom >= 4}
          >
            <ZoomIn className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Timeline Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        onScroll={(e) => setScrollLeft((e.target as HTMLDivElement).scrollLeft)}
      >
        <div 
          className="relative h-full"
          style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          onClick={handleTimelineClick}
        >
          {/* Time Ruler */}
          <div className="h-6 border-b border-white/10 relative">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${i * pixelsPerSecond}px` }}
              >
                <div className="h-3 w-px bg-white/30" />
                <span className="text-[10px] text-text-tertiary font-mono">
                  {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
            {/* Sub-second markers */}
            {zoom >= 1.5 && Array.from({ length: Math.ceil(duration * 2) }).map((_, i) => (
              <div
                key={`sub-${i}`}
                className="absolute top-0 h-1.5 w-px bg-white/10"
                style={{ left: `${i * pixelsPerSecond / 2}px` }}
              />
            ))}
          </div>

          {/* Overlay Tracks */}
          <div className="relative h-[calc(100%-1.5rem)] py-2">
            {/* Track Labels */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-surface-1/80 border-r border-white/10 z-10">
              {['arrow', 'text', 'ad', 'landmark', 'warning', 'destination'].map((type, i) => (
                <div 
                  key={type}
                  className="h-8 flex items-center px-2 text-xs text-text-tertiary capitalize"
                >
                  {type}
                </div>
              ))}
            </div>

            {/* Track Content */}
            <div className="ml-20 relative">
              {['arrow', 'text', 'ad', 'landmark', 'warning', 'destination'].map((type, trackIndex) => {
                const trackOverlays = overlays.filter(o => o.type === type);
                
                return (
                  <div 
                    key={type}
                    className="h-8 relative border-b border-white/5"
                  >
                    {trackOverlays.map(overlay => {
                      const left = overlay.timing.startTime * pixelsPerSecond;
                      const width = (overlay.timing.endTime - overlay.timing.startTime) * pixelsPerSecond;
                      
                      return (
                        <motion.div
                          key={overlay.id}
                          className={`absolute top-1 h-6 rounded cursor-pointer ${typeColors[type]} ${
                            overlay.id === selectedId 
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ 
                            left: `${left}px`, 
                            width: `${Math.max(width, 20)}px` 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOverlay(overlay.id);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="px-2 py-1 text-[10px] text-white font-medium truncate">
                            {overlay.direction || overlay.content?.en?.slice(0, 15) || type}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-neon-cyan z-20"
              style={{ left: `${80 + currentTime * pixelsPerSecond}px` }}
              animate={{ left: `${80 + currentTime * pixelsPerSecond}px` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Playhead Handle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-neon-cyan rounded-full shadow-lg shadow-neon-cyan/50" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
