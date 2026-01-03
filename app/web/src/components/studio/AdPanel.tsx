'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, DollarSign, Eye, MousePointer, Image } from 'lucide-react';
import type { OverlayType } from '@/lib/stores/overlay-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface AdPanelProps {
  onAddAd: (type: OverlayType, startTime: number) => string;
  currentTime: number;
}

// Mock ad inventory - in production would come from API
const AD_TEMPLATES = [
  {
    id: 'cafe-promo',
    advertiserName: 'Hospital Café',
    content: { en: 'Hungry? Grab a coffee at the main lobby café!' },
    ctaText: { en: 'Get Directions' },
    imageUrl: '/ads/cafe-promo.jpg',
    category: 'food',
  },
  {
    id: 'pharmacy',
    advertiserName: 'Pharmacy',
    content: { en: 'Pharmacy located on Floor 1. Open 24/7.' },
    ctaText: { en: 'View Hours' },
    imageUrl: '/ads/pharmacy.jpg',
    category: 'medical',
  },
  {
    id: 'gift-shop',
    advertiserName: 'Gift Shop',
    content: { en: 'Flowers, cards, and gifts for patients.' },
    ctaText: { en: 'Shop Now' },
    imageUrl: '/ads/gift-shop.jpg',
    category: 'shop',
  },
];

export function AdPanel({ onAddAd, currentTime }: AdPanelProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customAd, setCustomAd] = useState({
    advertiserName: '',
    content: '',
    ctaText: '',
    ctaUrl: '',
    imageUrl: '',
    skippable: true,
    skipAfter: 3,
  });

  const handleAddTemplate = (template: typeof AD_TEMPLATES[0]) => {
    onAddAd('ad', currentTime);
    // The store would be updated with template data
  };

  const handleAddCustom = () => {
    if (!customAd.advertiserName || !customAd.content) return;
    onAddAd('ad', currentTime);
    setShowCustomForm(false);
    setCustomAd({
      advertiserName: '',
      content: '',
      ctaText: '',
      ctaUrl: '',
      imageUrl: '',
      skippable: true,
      skipAfter: 3,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-neon-purple">
        <Megaphone className="w-5 h-5" />
        <h3 className="font-heading font-semibold">Advertisement Overlays</h3>
      </div>

      {/* Revenue Info */}
      <div className="bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-lg p-4 border border-neon-purple/30">
        <p className="text-sm text-text-secondary mb-2">
          Earn revenue by displaying non-intrusive ads during navigation
        </p>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-surface-1/50 rounded-lg p-2">
            <DollarSign className="w-4 h-4 text-neon-green mx-auto mb-1" />
            <p className="text-xs text-text-tertiary">$0.01</p>
            <p className="text-[10px] text-text-tertiary">per impression</p>
          </div>
          <div className="bg-surface-1/50 rounded-lg p-2">
            <MousePointer className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
            <p className="text-xs text-text-tertiary">$0.10</p>
            <p className="text-[10px] text-text-tertiary">per click</p>
          </div>
        </div>
      </div>

      {/* Ad Templates */}
      <div>
        <h4 className="text-xs font-semibold text-text-secondary mb-2">Quick Add Templates</h4>
        <div className="space-y-2">
          {AD_TEMPLATES.map(template => (
            <motion.button
              key={template.id}
              onClick={() => handleAddTemplate(template)}
              className="w-full flex items-center gap-3 p-3 bg-surface-2/50 rounded-lg border border-transparent hover:border-neon-purple/50 transition-all text-left"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-10 h-10 bg-neon-purple/20 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-neon-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {template.advertiserName}
                </p>
                <p className="text-xs text-text-tertiary truncate">
                  {template.content.en}
                </p>
              </div>
              <Plus className="w-4 h-4 text-text-tertiary" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Ad Form */}
      {showCustomForm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 bg-surface-2/30 rounded-lg p-4"
        >
          <h4 className="text-xs font-semibold text-text-secondary">Custom Advertisement</h4>
          
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Sponsor Name *</label>
            <Input
              value={customAd.advertiserName}
              onChange={(e) => setCustomAd({ ...customAd, advertiserName: e.target.value })}
              placeholder="e.g., Hospital Café"
            />
          </div>
          
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Ad Content *</label>
            <textarea
              value={customAd.content}
              onChange={(e) => setCustomAd({ ...customAd, content: e.target.value })}
              placeholder="Your advertisement message..."
              className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-text-primary resize-none"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">CTA Button</label>
              <Input
                value={customAd.ctaText}
                onChange={(e) => setCustomAd({ ...customAd, ctaText: e.target.value })}
                placeholder="Learn More"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">CTA URL</label>
              <Input
                value={customAd.ctaUrl}
                onChange={(e) => setCustomAd({ ...customAd, ctaUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Image URL (optional)</label>
            <Input
              value={customAd.imageUrl}
              onChange={(e) => setCustomAd({ ...customAd, imageUrl: e.target.value })}
              placeholder="https://example.com/ad-image.jpg"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-text-secondary">Skippable after {customAd.skipAfter}s</label>
            <Switch
              checked={customAd.skippable}
              onCheckedChange={(checked) => setCustomAd({ ...customAd, skippable: checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCustom}
              className="flex-1 btn-neon"
              disabled={!customAd.advertiserName || !customAd.content}
            >
              Add Ad
            </Button>
          </div>
        </motion.div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowCustomForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Ad
        </Button>
      )}

      {/* Guidelines */}
      <div className="text-xs text-text-tertiary space-y-1 bg-surface-2/30 rounded-lg p-3">
        <p className="font-semibold text-text-secondary">Ad Guidelines:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Ads should not obstruct navigation arrows</li>
          <li>Maximum 2 ads per minute of video</li>
          <li>Ads must be relevant to venue context</li>
          <li>All ads are reviewed before publishing</li>
        </ul>
      </div>
    </div>
  );
}
