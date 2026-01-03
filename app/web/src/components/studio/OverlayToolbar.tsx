'use client';

import { motion } from 'framer-motion';
import { 
  ArrowUp, Type, Megaphone, MapPin, 
  AlertTriangle, Target, Plus 
} from 'lucide-react';
import type { OverlayType } from '@/lib/stores/overlay-store';

interface OverlayToolbarProps {
  onAddOverlay: (type: OverlayType, startTime: number) => string;
  currentTime: number;
}

export function OverlayToolbar({ onAddOverlay, currentTime }: OverlayToolbarProps) {
  const tools = [
    {
      type: 'arrow' as OverlayType,
      label: 'Navigation Arrow',
      description: 'Add directional arrows to guide users',
      icon: ArrowUp,
      color: 'text-neon-cyan border-neon-cyan/50 hover:bg-neon-cyan/10',
    },
    {
      type: 'text' as OverlayType,
      label: 'Text Popup',
      description: 'Add informational text with translations',
      icon: Type,
      color: 'text-neon-blue border-neon-blue/50 hover:bg-neon-blue/10',
    },
    {
      type: 'landmark' as OverlayType,
      label: 'Landmark',
      description: 'Mark points of interest',
      icon: MapPin,
      color: 'text-neon-green border-neon-green/50 hover:bg-neon-green/10',
    },
    {
      type: 'warning' as OverlayType,
      label: 'Warning',
      description: 'Add caution or warning messages',
      icon: AlertTriangle,
      color: 'text-neon-orange border-neon-orange/50 hover:bg-neon-orange/10',
    },
    {
      type: 'destination' as OverlayType,
      label: 'Destination',
      description: 'Mark the arrival point',
      icon: Target,
      color: 'text-neon-pink border-neon-pink/50 hover:bg-neon-pink/10',
    },
  ];

  return (
    <div className="p-4 border-b border-white/10">
      <h3 className="text-sm font-heading font-semibold text-text-secondary mb-3">
        Add Overlay
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <motion.button
            key={tool.type}
            onClick={() => onAddOverlay(tool.type, currentTime)}
            className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${tool.color}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <tool.icon className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-medium">{tool.label}</p>
            </div>
          </motion.button>
        ))}
      </div>
      
      <p className="text-xs text-text-tertiary mt-3 text-center">
        Overlay will be added at {formatTime(currentTime)}
      </p>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
