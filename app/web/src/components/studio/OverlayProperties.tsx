'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Copy, X, Palette, Type as TypeIcon, Clock, Move } from 'lucide-react';
import { useOverlayStore, type Overlay, type ArrowDirection, type HapticPattern, type OverlayStyle } from '@/lib/stores/overlay-store';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface OverlayPropertiesProps {
  overlay: Overlay;
  duration: number;
}

// Color picker component with hex input
function ColorPicker({ 
  label, 
  value, 
  onChange, 
  showAlpha = false 
}: { 
  label: string; 
  value: string; 
  onChange: (color: string) => void;
  showAlpha?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Preset colors matching the design system
  const presets = [
    '#04D9FF', // neon-cyan
    '#1F51FF', // neon-blue
    '#8A00C4', // neon-purple
    '#FB48C4', // neon-pink
    '#FF5C00', // neon-orange
    '#2CFF05', // neon-green
    '#FAFAFA', // text-primary
    '#B0B0B0', // text-secondary
    '#0B192A', // bg-deepest
    '#1E1E1E', // bg-primary
    '#2E2E2E', // surface-1
    '#000000', // black
    '#FFFFFF', // white
    'transparent', // transparent
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs text-text-secondary block">{label}</label>
      <div className="flex gap-2">
        {/* Color swatch that opens picker */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg border-2 border-white/20 overflow-hidden flex-shrink-0 relative"
          style={{ backgroundColor: value || 'transparent' }}
        >
          {(!value || value === 'transparent') && (
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%),linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%)] bg-[length:8px_8px] bg-[position:0_0,4px_4px]" />
          )}
        </button>
        
        {/* Hex input */}
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#04D9FF"
          className="flex-1 font-mono text-sm"
        />
      </div>
      
      {/* Color picker dropdown */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-surface-2 rounded-lg border border-white/10 space-y-3"
        >
          {/* Native color input */}
          <input
            type="color"
            value={value?.startsWith('#') ? value : '#04D9FF'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
          
          {/* Presets */}
          <div className="grid grid-cols-7 gap-1">
            {presets.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className="w-6 h-6 rounded border border-white/20 transition-transform hover:scale-110"
                style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                title={color}
              >
                {color === 'transparent' && (
                  <div className="w-full h-full bg-[linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%),linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%)] bg-[length:4px_4px] bg-[position:0_0,2px_2px] rounded" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Duration input component with visual feedback
function DurationInput({
  label,
  value,
  min,
  max,
  onChange,
  videoDuration,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  videoDuration: number;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-2">
      <label className="text-xs text-text-secondary flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-neon-cyan">{formatTime(value)}</span>
      </label>
      
      {/* Visual bar showing position in video */}
      <div className="relative h-2 bg-surface-2 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-neon-cyan/50 to-neon-cyan rounded-full"
          style={{ width: `${(value / videoDuration) * 100}%` }}
        />
      </div>
      
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={0.1}
        onValueChange={([v]) => onChange(v)}
      />
      
      {/* Quick duration buttons */}
      <div className="flex gap-1">
        {[1, 2, 3, 5, 10].map((seconds) => (
          <button
            key={seconds}
            onClick={() => onChange(Math.min(value + seconds - (value % 1 || 1), max))}
            className="flex-1 text-xs py-1 px-2 bg-surface-2 hover:bg-surface-3 rounded transition-colors text-text-secondary"
          >
            +{seconds}s
          </button>
        ))}
      </div>
    </div>
  );
}

export function OverlayProperties({ overlay, duration }: OverlayPropertiesProps) {
  const { updateOverlay, deleteOverlay, duplicateOverlay, selectOverlay } = useOverlayStore();
  const [activeTab, setActiveTab] = useState('content');

  const handleUpdate = useCallback((updates: Partial<Overlay>) => {
    updateOverlay(overlay.id, updates);
  }, [overlay.id, updateOverlay]);

  const handleStyleUpdate = useCallback((styleUpdates: Partial<OverlayStyle>) => {
    handleUpdate({
      style: { ...overlay.style, ...styleUpdates }
    });
  }, [overlay.style, handleUpdate]);

  const handleDelete = () => {
    deleteOverlay(overlay.id);
    selectOverlay(null);
  };

  const handleDuplicate = () => {
    duplicateOverlay(overlay.id);
  };

  // Calculate display duration
  const overlayDuration = overlay.timing.endTime - overlay.timing.startTime;

  return (
    <motion.div
      className="flex-1 overflow-auto border-t border-white/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-1/50">
        <div>
          <h3 className="text-sm font-heading font-semibold text-text-primary capitalize flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            {overlay.type} Overlay
          </h3>
          <p className="text-xs text-text-tertiary font-mono mt-0.5">
            Duration: {overlayDuration.toFixed(1)}s
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDuplicate}
            className="p-2 hover:bg-white/10 rounded transition text-text-secondary hover:text-neon-cyan"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/20 rounded transition text-text-secondary hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectOverlay(null)}
            className="p-2 hover:bg-white/10 rounded transition text-text-secondary hover:text-text-primary"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start p-1 bg-surface-2/50 rounded-none border-b border-white/10">
          <TabsTrigger value="content" className="flex-1 text-xs gap-1">
            <TypeIcon className="w-3 h-3" />
            Content
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex-1 text-xs gap-1">
            <Clock className="w-3 h-3" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="position" className="flex-1 text-xs gap-1">
            <Move className="w-3 h-3" />
            Position
          </TabsTrigger>
          <TabsTrigger value="style" className="flex-1 text-xs gap-1">
            <Palette className="w-3 h-3" />
            Style
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="p-4 space-y-4 m-0">
          {/* Arrow direction */}
          {overlay.type === 'arrow' && (
            <>
              <div>
                <label className="text-xs text-text-secondary mb-2 block">Direction</label>
                <Select
                  value={overlay.direction || 'straight'}
                  onValueChange={(value) => handleUpdate({ direction: value as ArrowDirection })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight">↑ Straight</SelectItem>
                    <SelectItem value="left">← Left</SelectItem>
                    <SelectItem value="right">→ Right</SelectItem>
                    <SelectItem value="slight-left">↖ Slight Left</SelectItem>
                    <SelectItem value="slight-right">↗ Slight Right</SelectItem>
                    <SelectItem value="u-turn">↩ U-Turn</SelectItem>
                    <SelectItem value="up-stairs">⬆ Up Stairs</SelectItem>
                    <SelectItem value="down-stairs">⬇ Down Stairs</SelectItem>
                    <SelectItem value="elevator">🛗 Elevator</SelectItem>
                    <SelectItem value="escalator">↗ Escalator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-2 flex justify-between">
                  <span>Distance</span>
                  <span className="text-text-tertiary">{overlay.distance || 0}m</span>
                </label>
                <Slider
                  value={[overlay.distance || 0]}
                  min={0}
                  max={500}
                  step={5}
                  onValueChange={([value]) => handleUpdate({ distance: value })}
                />
              </div>
            </>
          )}

          {/* Text/Title content */}
          {(overlay.type === 'text' || overlay.type === 'landmark' || overlay.type === 'warning' || overlay.type === 'destination') && (
            <>
              {(overlay.type === 'text' || overlay.type === 'warning') && (
                <div>
                  <label className="text-xs text-text-secondary mb-2 block">Title (optional)</label>
                  <Input
                    value={overlay.title?.en || ''}
                    onChange={(e) => handleUpdate({ 
                      title: { ...overlay.title, en: e.target.value } 
                    })}
                    placeholder="Enter title..."
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-text-secondary mb-2 block">Content</label>
                <textarea
                  value={overlay.content?.en || ''}
                  onChange={(e) => handleUpdate({ 
                    content: { ...overlay.content, en: e.target.value } 
                  })}
                  placeholder="Enter content..."
                  className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-text-primary resize-none focus:border-neon-cyan focus:outline-none transition-colors"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Warning severity */}
          {overlay.type === 'warning' && (
            <div>
              <label className="text-xs text-text-secondary mb-2 block">Severity</label>
              <Select
                value={overlay.severity || 'info'}
                onValueChange={(value) => handleUpdate({ severity: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="caution">⚠️ Caution</SelectItem>
                  <SelectItem value="warning">🔶 Warning</SelectItem>
                  <SelectItem value="danger">🔴 Danger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Landmark category */}
          {overlay.type === 'landmark' && (
            <div>
              <label className="text-xs text-text-secondary mb-2 block">Category</label>
              <Select
                value={overlay.category || 'info'}
                onValueChange={(value) => handleUpdate({ category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restroom">🚻 Restroom</SelectItem>
                  <SelectItem value="elevator">🛗 Elevator</SelectItem>
                  <SelectItem value="exit">🚪 Exit</SelectItem>
                  <SelectItem value="info">ℹ️ Information</SelectItem>
                  <SelectItem value="food">🍽️ Food</SelectItem>
                  <SelectItem value="shop">🛍️ Shop</SelectItem>
                  <SelectItem value="medical">🏥 Medical</SelectItem>
                  <SelectItem value="custom">📍 Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Destination arrived */}
          {overlay.type === 'destination' && (
            <div className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg">
              <label className="text-xs text-text-secondary">Show "Arrived" State</label>
              <Switch
                checked={overlay.arrived || false}
                onCheckedChange={(checked) => handleUpdate({ arrived: checked })}
              />
            </div>
          )}

          {/* Haptic Feedback */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Haptic Feedback</label>
            <Select
              value={overlay.haptic || 'none'}
              onValueChange={(value) => handleUpdate({ 
                haptic: value === 'none' ? undefined : value as HapticPattern 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="turn-left">↩ Turn Left</SelectItem>
                <SelectItem value="turn-right">↪ Turn Right</SelectItem>
                <SelectItem value="straight">⬆ Straight</SelectItem>
                <SelectItem value="arrived">🎯 Arrived</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="attention">❗ Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TTS Content */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">
              Text-to-Speech
              <span className="text-text-tertiary ml-1">(accessibility)</span>
            </label>
            <Input
              value={overlay.ttsContent?.en || ''}
              onChange={(e) => handleUpdate({ 
                ttsContent: { ...overlay.ttsContent, en: e.target.value } 
              })}
              placeholder="Text spoken aloud..."
            />
          </div>
        </TabsContent>

        {/* Timing Tab - Enhanced */}
        <TabsContent value="timing" className="p-4 space-y-5 m-0">
          {/* Quick duration selector */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Quick Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '2s', value: 2 },
                { label: '5s', value: 5 },
                { label: '10s', value: 10 },
                { label: '15s', value: 15 },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleUpdate({
                    timing: {
                      ...overlay.timing,
                      endTime: overlay.timing.startTime + value
                    }
                  })}
                  className={`py-2 px-3 rounded-lg text-xs font-mono transition-all ${
                    Math.abs(overlayDuration - value) < 0.5
                      ? 'bg-neon-cyan text-bg-deepest'
                      : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time */}
          <DurationInput
            label="Start Time"
            value={overlay.timing.startTime}
            min={0}
            max={duration - 0.5}
            onChange={(value) => handleUpdate({
              timing: { 
                ...overlay.timing, 
                startTime: value,
                endTime: Math.max(overlay.timing.endTime, value + 0.5)
              }
            })}
            videoDuration={duration}
          />

          {/* End Time */}
          <DurationInput
            label="End Time"
            value={overlay.timing.endTime}
            min={overlay.timing.startTime + 0.5}
            max={duration}
            onChange={(value) => handleUpdate({
              timing: { ...overlay.timing, endTime: value }
            })}
            videoDuration={duration}
          />

          {/* Display Duration (calculated) */}
          <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neon-cyan">Display Duration</span>
              <span className="font-mono text-lg text-neon-cyan font-bold">
                {overlayDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Fade Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-2 flex justify-between">
                <span>Fade In</span>
                <span className="text-text-tertiary">{overlay.timing.fadeIn}ms</span>
              </label>
              <Slider
                value={[overlay.timing.fadeIn]}
                min={0}
                max={1000}
                step={50}
                onValueChange={([value]) => handleUpdate({ 
                  timing: { ...overlay.timing, fadeIn: value } 
                })}
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-2 flex justify-between">
                <span>Fade Out</span>
                <span className="text-text-tertiary">{overlay.timing.fadeOut}ms</span>
              </label>
              <Slider
                value={[overlay.timing.fadeOut]}
                min={0}
                max={1000}
                step={50}
                onValueChange={([value]) => handleUpdate({ 
                  timing: { ...overlay.timing, fadeOut: value } 
                })}
              />
            </div>
          </div>
        </TabsContent>

        {/* Position Tab */}
        <TabsContent value="position" className="p-4 space-y-4 m-0">
          {/* Visual position grid */}
          <div className="relative aspect-[9/16] bg-surface-2 rounded-lg overflow-hidden">
            <div 
              className="absolute w-4 h-4 bg-neon-cyan rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-neon-cyan/50"
              style={{
                left: `${overlay.position.x}%`,
                top: `${overlay.position.y}%`,
              }}
            />
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/5" />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>X Position</span>
              <span className="text-text-tertiary font-mono">{overlay.position.x.toFixed(0)}%</span>
            </label>
            <Slider
              value={[overlay.position.x]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => handleUpdate({ 
                position: { ...overlay.position, x: value } 
              })}
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Y Position</span>
              <span className="text-text-tertiary font-mono">{overlay.position.y.toFixed(0)}%</span>
            </label>
            <Slider
              value={[overlay.position.y]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => handleUpdate({ 
                position: { ...overlay.position, y: value } 
              })}
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Scale</span>
              <span className="text-text-tertiary font-mono">{overlay.position.scale.toFixed(2)}x</span>
            </label>
            <Slider
              value={[overlay.position.scale * 100]}
              min={25}
              max={200}
              step={5}
              onValueChange={([value]) => handleUpdate({ 
                position: { ...overlay.position, scale: value / 100 } 
              })}
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Rotation</span>
              <span className="text-text-tertiary font-mono">{overlay.position.rotation.toFixed(0)}°</span>
            </label>
            <Slider
              value={[overlay.position.rotation]}
              min={-180}
              max={180}
              step={5}
              onValueChange={([value]) => handleUpdate({ 
                position: { ...overlay.position, rotation: value } 
              })}
            />
          </div>
        </TabsContent>

        {/* Style Tab - Full styling controls */}
        <TabsContent value="style" className="p-4 space-y-4 m-0">
          {/* Background Color */}
          <ColorPicker
            label="Background Color"
            value={overlay.style?.backgroundColor || 'rgba(0,0,0,0.8)'}
            onChange={(color) => handleStyleUpdate({ backgroundColor: color })}
          />

          {/* Text Color */}
          <ColorPicker
            label="Text Color"
            value={overlay.style?.textColor || '#FAFAFA'}
            onChange={(color) => handleStyleUpdate({ textColor: color })}
          />

          {/* Border Color */}
          <ColorPicker
            label="Border Color"
            value={overlay.style?.borderColor || 'rgba(255,255,255,0.2)'}
            onChange={(color) => handleStyleUpdate({ borderColor: color })}
          />

          {/* Border Width */}
          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Border Width</span>
              <span className="text-text-tertiary">{overlay.style?.borderWidth ?? 1}px</span>
            </label>
            <Slider
              value={[overlay.style?.borderWidth ?? 1]}
              min={0}
              max={8}
              step={1}
              onValueChange={([value]) => handleStyleUpdate({ borderWidth: value })}
            />
          </div>

          {/* Border Radius */}
          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Border Radius</span>
              <span className="text-text-tertiary">{overlay.style?.borderRadius ?? 8}px</span>
            </label>
            <Slider
              value={[overlay.style?.borderRadius ?? 8]}
              min={0}
              max={32}
              step={2}
              onValueChange={([value]) => handleStyleUpdate({ borderRadius: value })}
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs text-text-secondary mb-2 flex justify-between">
              <span>Opacity</span>
              <span className="text-text-tertiary">{((overlay.style?.opacity ?? 1) * 100).toFixed(0)}%</span>
            </label>
            <Slider
              value={[(overlay.style?.opacity ?? 1) * 100]}
              min={10}
              max={100}
              step={5}
              onValueChange={([value]) => handleStyleUpdate({ opacity: value / 100 })}
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Font Size</label>
            <Select
              value={overlay.style?.fontSize || 'md'}
              onValueChange={(value) => handleStyleUpdate({ fontSize: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small (12px)</SelectItem>
                <SelectItem value="md">Medium (14px)</SelectItem>
                <SelectItem value="lg">Large (16px)</SelectItem>
                <SelectItem value="xl">Extra Large (20px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Weight */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Font Weight</label>
            <Select
              value={overlay.style?.fontWeight || 'normal'}
              onValueChange={(value) => handleStyleUpdate({ fontWeight: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Effects toggles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Effects</h4>
            
            <div className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg">
              <div>
                <label className="text-xs text-text-secondary">Drop Shadow</label>
                <p className="text-xs text-text-tertiary mt-0.5">Add depth with shadow</p>
              </div>
              <Switch
                checked={overlay.style?.shadow || false}
                onCheckedChange={(checked) => handleStyleUpdate({ shadow: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg">
              <div>
                <label className="text-xs text-text-secondary">Neon Glow</label>
                <p className="text-xs text-text-tertiary mt-0.5">Add glow effect</p>
              </div>
              <Switch
                checked={overlay.style?.glow || false}
                onCheckedChange={(checked) => handleStyleUpdate({ glow: checked })}
              />
            </div>
          </div>

          {/* Glow Color (only if glow enabled) */}
          {overlay.style?.glow && (
            <ColorPicker
              label="Glow Color"
              value={overlay.style?.glowColor || '#04D9FF'}
              onChange={(color) => handleStyleUpdate({ glowColor: color })}
            />
          )}

          {/* Preview Box */}
          <div className="p-4 bg-bg-deepest rounded-lg border border-white/10">
            <p className="text-xs text-text-tertiary mb-2">Preview</p>
            <div
              className="px-4 py-3 transition-all"
              style={{
                backgroundColor: overlay.style?.backgroundColor || 'rgba(0,0,0,0.8)',
                color: overlay.style?.textColor || '#FAFAFA',
                borderWidth: `${overlay.style?.borderWidth ?? 1}px`,
                borderStyle: 'solid',
                borderColor: overlay.style?.borderColor || 'rgba(255,255,255,0.2)',
                borderRadius: `${overlay.style?.borderRadius ?? 8}px`,
                opacity: overlay.style?.opacity ?? 1,
                fontSize: {
                  sm: '12px',
                  md: '14px', 
                  lg: '16px',
                  xl: '20px'
                }[overlay.style?.fontSize || 'md'],
                fontWeight: overlay.style?.fontWeight || 'normal',
                boxShadow: [
                  overlay.style?.shadow ? '0 4px 12px rgba(0,0,0,0.5)' : '',
                  overlay.style?.glow ? `0 0 20px ${overlay.style?.glowColor || '#04D9FF'}40` : ''
                ].filter(Boolean).join(', ') || 'none',
              }}
            >
              Sample overlay text
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}
