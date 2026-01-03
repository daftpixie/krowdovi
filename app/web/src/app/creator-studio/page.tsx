'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/studio/VideoPlayer';
import { Timeline } from '@/components/studio/Timeline';
import { OverlayToolbar } from '@/components/studio/OverlayToolbar';
import { OverlayProperties } from '@/components/studio/OverlayProperties';
import { TranslationPanel } from '@/components/studio/TranslationPanel';
import { AdPanel } from '@/components/studio/AdPanel';
import { PreviewMode } from '@/components/studio/PreviewMode';
import { useOverlayStore } from '@/lib/stores/overlay-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Play, Save, Upload, Eye, Settings, 
  Languages, Megaphone, ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';

export default function CreatorStudioPage() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState('overlays');
  
  const { 
    overlays, 
    selectedId, 
    selectOverlay, 
    addOverlay 
  } = useOverlayStore();

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const selectedOverlay = overlays.find(o => o.id === selectedId);

  // Get overlays visible at current time
  const visibleOverlays = overlays.filter(
    o => currentTime >= o.timing.startTime && currentTime <= o.timing.endTime
  );

  if (isPreviewing) {
    return (
      <PreviewMode 
        overlays={overlays}
        onExit={() => setIsPreviewing(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-deepest">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-surface-1/50 backdrop-blur-xl">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-lg font-heading font-bold text-text-primary">
                Creator Studio
              </h1>
              <p className="text-xs text-text-tertiary">
                Hospital Lobby → Radiology
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsPreviewing(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button className="btn-neon" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Tools */}
        <aside className="w-80 border-r border-white/10 bg-surface-1/30 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start gap-1 p-2 bg-transparent border-b border-white/10">
              <TabsTrigger value="overlays" className="flex-1">
                Overlays
              </TabsTrigger>
              <TabsTrigger value="translations" className="flex-1">
                <Languages className="w-4 h-4 mr-1" />
                i18n
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex-1">
                <Megaphone className="w-4 h-4 mr-1" />
                Ads
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overlays" className="flex-1 m-0 overflow-hidden flex flex-col">
              <OverlayToolbar onAddOverlay={addOverlay} currentTime={currentTime} />
              {selectedOverlay && (
                <OverlayProperties 
                  overlay={selectedOverlay} 
                  duration={duration}
                />
              )}
            </TabsContent>
            
            <TabsContent value="translations" className="flex-1 m-0 overflow-auto p-4">
              <TranslationPanel overlays={overlays} />
            </TabsContent>
            
            <TabsContent value="ads" className="flex-1 m-0 overflow-auto p-4">
              <AdPanel onAddAd={addOverlay} currentTime={currentTime} />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Main Content - Video + Timeline */}
        <main className="flex-1 flex flex-col">
          {/* Video Area */}
          <div className="flex-1 relative bg-bg-primary flex items-center justify-center p-4">
            <motion.div 
              className="relative aspect-[9/16] h-full max-h-[calc(100vh-16rem)] bg-black rounded-2xl overflow-hidden shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <VideoPlayer
                src="/demo/navigation-demo.mp4"
                hlsSrc="https://customer-xxx.cloudflarestream.com/xxx/manifest/video.m3u8"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onPlayStateChange={setIsPlaying}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
              
              {/* Overlay Render Layer */}
              <div className="absolute inset-0 pointer-events-none">
                {visibleOverlays.map(overlay => (
                  <OverlayRenderer
                    key={overlay.id}
                    overlay={overlay}
                    isSelected={overlay.id === selectedId}
                    onSelect={() => selectOverlay(overlay.id)}
                    currentTime={currentTime}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Timeline */}
          <div className="h-48 border-t border-white/10 bg-surface-1/50">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              overlays={overlays}
              selectedId={selectedId}
              onSeek={handleSeek}
              onSelectOverlay={selectOverlay}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />
          </div>
        </main>

        {/* Right Panel - Overlay List */}
        <aside className="w-64 border-l border-white/10 bg-surface-1/30 overflow-auto">
          <div className="p-4">
            <h3 className="text-sm font-heading font-semibold text-text-secondary mb-4">
              Overlay Timeline
            </h3>
            <div className="space-y-2">
              {overlays.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-8">
                  No overlays yet. Use the toolbar to add navigation arrows, text, or ads.
                </p>
              ) : (
                overlays
                  .sort((a, b) => a.timing.startTime - b.timing.startTime)
                  .map(overlay => (
                    <OverlayListItem
                      key={overlay.id}
                      overlay={overlay}
                      isSelected={overlay.id === selectedId}
                      isVisible={visibleOverlays.includes(overlay)}
                      onClick={() => selectOverlay(overlay.id)}
                    />
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Overlay Renderer Component
function OverlayRenderer({ 
  overlay, 
  isSelected, 
  onSelect,
  currentTime 
}: { 
  overlay: any; 
  isSelected: boolean;
  onSelect: () => void;
  currentTime: number;
}) {
  const { timing, position, type } = overlay;
  
  // Calculate opacity for fade in/out
  let opacity = 1;
  const fadeInEnd = timing.startTime + (timing.fadeIn || 200) / 1000;
  const fadeOutStart = timing.endTime - (timing.fadeOut || 200) / 1000;
  
  if (currentTime < fadeInEnd) {
    opacity = (currentTime - timing.startTime) / ((timing.fadeIn || 200) / 1000);
  } else if (currentTime > fadeOutStart) {
    opacity = (timing.endTime - currentTime) / ((timing.fadeOut || 200) / 1000);
  }

  return (
    <div
      className={`absolute pointer-events-auto cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-neon-cyan ring-offset-2 ring-offset-transparent' : ''
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${position.scale || 1}) rotate(${position.rotation || 0}deg)`,
        opacity: Math.max(0, Math.min(1, opacity)),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {type === 'arrow' && (
        <ArrowOverlayDisplay overlay={overlay} />
      )}
      {type === 'text' && (
        <TextOverlayDisplay overlay={overlay} />
      )}
      {type === 'ad' && (
        <AdOverlayDisplay overlay={overlay} />
      )}
      {type === 'landmark' && (
        <LandmarkOverlayDisplay overlay={overlay} />
      )}
      {type === 'warning' && (
        <WarningOverlayDisplay overlay={overlay} />
      )}
      {type === 'destination' && (
        <DestinationOverlayDisplay overlay={overlay} />
      )}
    </div>
  );
}

// Individual Overlay Displays
function ArrowOverlayDisplay({ overlay }: { overlay: any }) {
  const arrowIcons: Record<string, string> = {
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
    <div className="flex flex-col items-center gap-1">
      <div className="w-16 h-16 rounded-full bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center neon-glow">
        <span className="text-3xl text-neon-cyan">
          {arrowIcons[overlay.direction] || '→'}
        </span>
      </div>
      {overlay.distance && (
        <span className="text-xs font-mono text-white bg-black/60 px-2 py-0.5 rounded">
          {overlay.distance}m
        </span>
      )}
    </div>
  );
}

function TextOverlayDisplay({ overlay }: { overlay: any }) {
  const content = overlay.content?.en || 'Text';
  const title = overlay.title?.en;

  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 max-w-xs border border-white/20">
      {title && (
        <h4 className="text-sm font-heading font-bold text-neon-cyan mb-1">{title}</h4>
      )}
      <p className="text-sm text-white">{content}</p>
    </div>
  );
}

function AdOverlayDisplay({ overlay }: { overlay: any }) {
  const content = overlay.content?.en || 'Advertisement';
  const ctaText = overlay.ctaText?.en || 'Learn More';

  return (
    <div className="bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm rounded-lg px-4 py-3 max-w-xs border border-neon-purple/50">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-4 h-4 text-neon-purple" />
        <span className="text-xs text-neon-purple font-medium">
          {overlay.advertiserName || 'Sponsored'}
        </span>
      </div>
      <p className="text-sm text-white mb-2">{content}</p>
      {overlay.imageUrl && (
        <img src={overlay.imageUrl} alt="" className="w-full h-20 object-cover rounded mb-2" />
      )}
      <button className="text-xs bg-neon-purple text-white px-3 py-1 rounded-full">
        {ctaText}
      </button>
    </div>
  );
}

function LandmarkOverlayDisplay({ overlay }: { overlay: any }) {
  const name = overlay.content?.en || 'Landmark';
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
    <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20">
      <span className="text-lg">{icons[overlay.category] || '📍'}</span>
      <span className="text-sm text-white font-medium">{name}</span>
    </div>
  );
}

function WarningOverlayDisplay({ overlay }: { overlay: any }) {
  const message = overlay.content?.en || 'Warning';
  const colors: Record<string, string> = {
    'info': 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan',
    'caution': 'bg-neon-yellow/20 border-neon-yellow text-neon-yellow',
    'warning': 'bg-neon-orange/20 border-neon-orange text-neon-orange',
    'danger': 'bg-red-500/20 border-red-500 text-red-500',
  };

  return (
    <div className={`rounded-lg px-4 py-2 border-2 ${colors[overlay.severity] || colors.info}`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function DestinationOverlayDisplay({ overlay }: { overlay: any }) {
  const name = overlay.content?.en || 'Destination';
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-20 h-20 rounded-full bg-neon-green/20 border-4 border-neon-green flex items-center justify-center animate-pulse-glow">
        <span className="text-4xl">📍</span>
      </div>
      <div className="bg-neon-green text-black font-heading font-bold px-4 py-2 rounded-full text-sm">
        {overlay.arrived ? '✓ Arrived!' : name}
      </div>
    </div>
  );
}

// Overlay List Item
function OverlayListItem({ 
  overlay, 
  isSelected, 
  isVisible,
  onClick 
}: { 
  overlay: any; 
  isSelected: boolean;
  isVisible: boolean;
  onClick: () => void;
}) {
  const typeIcons: Record<string, string> = {
    'arrow': '→',
    'text': 'T',
    'ad': '📢',
    'landmark': '📍',
    'warning': '⚠️',
    'destination': '🎯',
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all ${
        isSelected 
          ? 'bg-neon-cyan/20 border border-neon-cyan' 
          : 'bg-surface-2/50 border border-transparent hover:bg-surface-2'
      } ${isVisible ? 'opacity-100' : 'opacity-50'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{typeIcons[overlay.type] || '?'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary capitalize truncate">
            {overlay.type} {overlay.direction && `- ${overlay.direction}`}
          </p>
          <p className="text-xs text-text-tertiary font-mono">
            {formatTime(overlay.timing.startTime)} - {formatTime(overlay.timing.endTime)}
          </p>
        </div>
      </div>
    </button>
  );
}
