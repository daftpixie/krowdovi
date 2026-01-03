'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useOverlayStore, type Overlay, type TranslatedText } from '@/lib/stores/overlay-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TranslationPanelProps {
  overlays: Overlay[];
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

export function TranslationPanel({ overlays }: TranslationPanelProps) {
  const { updateTranslation } = useOverlayStore();
  const [selectedLang, setSelectedLang] = useState<string>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);

  // Get overlays with translatable content
  const translatableOverlays = overlays.filter(
    o => o.content?.en || o.title?.en || o.ttsContent?.en || o.ctaText?.en
  );

  // Count translations for progress
  const getTotalFields = () => {
    let total = 0;
    translatableOverlays.forEach(o => {
      if (o.content?.en) total++;
      if (o.title?.en) total++;
      if (o.ttsContent?.en) total++;
      if (o.ctaText?.en) total++;
    });
    return total;
  };

  const getTranslatedFields = (lang: string) => {
    let translated = 0;
    translatableOverlays.forEach(o => {
      if (o.content?.en && o.content[lang]) translated++;
      if (o.title?.en && o.title[lang]) translated++;
      if (o.ttsContent?.en && o.ttsContent[lang]) translated++;
      if (o.ctaText?.en && o.ctaText[lang]) translated++;
    });
    return translated;
  };

  const totalFields = getTotalFields();

  // AI Translation (would call API)
  const handleAutoTranslate = async () => {
    setIsTranslating(true);
    setTranslationProgress(0);

    // Simulate AI translation progress
    const fieldsToTranslate = translatableOverlays.flatMap(o => {
      const fields: { overlayId: string; field: 'content' | 'title' | 'ttsContent' | 'ctaText'; text: string }[] = [];
      if (o.content?.en) fields.push({ overlayId: o.id, field: 'content', text: o.content.en });
      if (o.title?.en) fields.push({ overlayId: o.id, field: 'title', text: o.title.en });
      if (o.ttsContent?.en) fields.push({ overlayId: o.id, field: 'ttsContent', text: o.ttsContent.en });
      if (o.ctaText?.en) fields.push({ overlayId: o.id, field: 'ctaText', text: o.ctaText.en });
      return fields;
    });

    for (let i = 0; i < fieldsToTranslate.length; i++) {
      const field = fieldsToTranslate[i];
      
      // In production, this would call the translation API
      // For demo, we'll use placeholder translations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const mockTranslation = getMockTranslation(field.text, selectedLang);
      updateTranslation(field.overlayId, field.field, selectedLang, mockTranslation);
      
      setTranslationProgress(((i + 1) / fieldsToTranslate.length) * 100);
    }

    setIsTranslating(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-neon-cyan">
        <Globe className="w-5 h-5" />
        <h3 className="font-heading font-semibold">Multi-Language Support</h3>
      </div>

      {/* Language Selector */}
      <div className="grid grid-cols-4 gap-1">
        {SUPPORTED_LANGUAGES.slice(1).map(lang => {
          const translated = getTranslatedFields(lang.code);
          const isComplete = translated === totalFields && totalFields > 0;
          
          return (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              className={`p-2 rounded-lg text-center transition-all ${
                selectedLang === lang.code
                  ? 'bg-neon-cyan/20 border border-neon-cyan'
                  : 'bg-surface-2/50 border border-transparent hover:bg-surface-2'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <p className="text-xs mt-1 text-text-secondary">{lang.code.toUpperCase()}</p>
              {isComplete && (
                <Check className="w-3 h-3 text-neon-green mx-auto mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="bg-surface-2/50 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-text-secondary">
            {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name} Translation
          </span>
          <span className="text-text-tertiary">
            {getTranslatedFields(selectedLang)} / {totalFields}
          </span>
        </div>
        <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-neon-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${(getTranslatedFields(selectedLang) / Math.max(totalFields, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Auto Translate Button */}
      <Button
        onClick={handleAutoTranslate}
        disabled={isTranslating || totalFields === 0}
        className="w-full btn-neon"
      >
        {isTranslating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Translating... {Math.round(translationProgress)}%
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Translate All to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name}
          </>
        )}
      </Button>

      {/* Manual Translation List */}
      <div className="space-y-3 max-h-[300px] overflow-auto">
        {translatableOverlays.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">
            Add overlays with text content to enable translations
          </p>
        ) : (
          translatableOverlays.map(overlay => (
            <TranslationItem
              key={overlay.id}
              overlay={overlay}
              targetLang={selectedLang}
              onUpdate={updateTranslation}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TranslationItem({
  overlay,
  targetLang,
  onUpdate,
}: {
  overlay: Overlay;
  targetLang: string;
  onUpdate: (id: string, field: 'content' | 'title' | 'ttsContent' | 'ctaText', lang: string, value: string) => void;
}) {
  return (
    <div className="bg-surface-2/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-tertiary capitalize">
          {overlay.type}
        </span>
      </div>

      {overlay.content?.en && (
        <div className="space-y-1">
          <p className="text-xs text-text-tertiary">Content:</p>
          <p className="text-xs text-text-secondary bg-surface-1 p-2 rounded">
            {overlay.content.en}
          </p>
          <Input
            value={overlay.content[targetLang] || ''}
            onChange={(e) => onUpdate(overlay.id, 'content', targetLang, e.target.value)}
            placeholder={`${targetLang.toUpperCase()} translation...`}
            className="text-xs"
          />
        </div>
      )}

      {overlay.title?.en && (
        <div className="space-y-1">
          <p className="text-xs text-text-tertiary">Title:</p>
          <Input
            value={overlay.title[targetLang] || ''}
            onChange={(e) => onUpdate(overlay.id, 'title', targetLang, e.target.value)}
            placeholder={`${targetLang.toUpperCase()} translation...`}
            className="text-xs"
          />
        </div>
      )}

      {overlay.ttsContent?.en && (
        <div className="space-y-1">
          <p className="text-xs text-text-tertiary">TTS:</p>
          <Input
            value={overlay.ttsContent[targetLang] || ''}
            onChange={(e) => onUpdate(overlay.id, 'ttsContent', targetLang, e.target.value)}
            placeholder={`${targetLang.toUpperCase()} translation...`}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}

// Mock translation function (would be replaced with API call)
function getMockTranslation(text: string, lang: string): string {
  const mockTranslations: Record<string, Record<string, string>> = {
    'Turn left': { es: 'Gira a la izquierda', fr: 'Tournez à gauche', de: 'Links abbiegen' },
    'Turn right': { es: 'Gira a la derecha', fr: 'Tournez à droite', de: 'Rechts abbiegen' },
    'Continue straight': { es: 'Continúa recto', fr: 'Continuez tout droit', de: 'Geradeaus weiter' },
    'You have arrived': { es: 'Has llegado', fr: 'Vous êtes arrivé', de: 'Sie sind angekommen' },
  };

  return mockTranslations[text]?.[lang] || `[${lang.toUpperCase()}] ${text}`;
}
