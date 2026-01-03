import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

// ============================================
// OVERLAY TYPES
// ============================================

export type OverlayType = 'arrow' | 'text' | 'ad' | 'landmark' | 'warning' | 'destination';

export type ArrowDirection = 
  | 'straight' | 'left' | 'right' 
  | 'slight-left' | 'slight-right' 
  | 'u-turn' | 'up-stairs' | 'down-stairs' 
  | 'elevator' | 'escalator';

export type HapticPattern = 
  | 'turn-left' | 'turn-right' | 'straight' 
  | 'arrived' | 'warning' | 'attention';

export interface TranslatedText {
  en: string;
  es?: string;
  fr?: string;
  de?: string;
  zh?: string;
  ja?: string;
  ko?: string;
  ar?: string;
  hi?: string;
  pt?: string;
  ru?: string;
  [key: string]: string | undefined;
}

export interface OverlayPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface OverlayTiming {
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
}

export interface OverlayStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  fontWeight?: 'normal' | 'medium' | 'bold';
  shadow?: boolean;
  glow?: boolean;
  glowColor?: string;
}

export interface Overlay {
  id: string;
  type: OverlayType;
  position: OverlayPosition;
  timing: OverlayTiming;
  style?: OverlayStyle;
  haptic?: HapticPattern;
  ttsContent?: TranslatedText;
  ariaLabel?: TranslatedText;
  
  // Type-specific fields
  direction?: ArrowDirection;
  distance?: number;
  content?: TranslatedText;
  title?: TranslatedText;
  icon?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  
  // Ad-specific
  adId?: string;
  advertiserName?: string;
  imageUrl?: string;
  ctaText?: TranslatedText;
  ctaUrl?: string;
  skippable?: boolean;
  skipAfter?: number;
  
  // Warning-specific
  severity?: 'info' | 'caution' | 'warning' | 'danger';
  
  // Landmark-specific
  category?: 'restroom' | 'elevator' | 'exit' | 'info' | 'food' | 'shop' | 'medical' | 'custom';
  
  // Destination-specific
  arrived?: boolean;
}

// ============================================
// STORE INTERFACE
// ============================================

interface OverlayStore {
  // State
  overlays: Overlay[];
  selectedId: string | null;
  videoId: string | null;
  isDirty: boolean;
  history: Overlay[][];
  historyIndex: number;
  
  // Selection
  selectOverlay: (id: string | null) => void;
  
  // CRUD Operations
  addOverlay: (type: OverlayType, startTime: number) => string;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  deleteOverlay: (id: string) => void;
  duplicateOverlay: (id: string) => string | null;
  
  // Bulk Operations
  setOverlays: (overlays: Overlay[]) => void;
  clearOverlays: () => void;
  
  // Position & Timing
  moveOverlay: (id: string, position: Partial<OverlayPosition>) => void;
  resizeOverlay: (id: string, timing: Partial<OverlayTiming>) => void;
  
  // Translation Helpers
  updateTranslation: (id: string, field: 'content' | 'title' | 'ttsContent' | 'ctaText', lang: string, value: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Video
  setVideoId: (id: string) => void;
  
  // Persistence
  markClean: () => void;
}

// ============================================
// DEFAULT VALUES
// ============================================

const createDefaultOverlay = (type: OverlayType, startTime: number): Overlay => {
  const base: Overlay = {
    id: uuid(),
    type,
    position: { x: 50, y: 50, scale: 1, rotation: 0 },
    timing: { 
      startTime, 
      endTime: startTime + 5, 
      fadeIn: 200, 
      fadeOut: 200 
    },
  };

  switch (type) {
    case 'arrow':
      return {
        ...base,
        direction: 'straight',
        distance: 10,
        haptic: 'straight',
        position: { x: 50, y: 70, scale: 1, rotation: 0 },
      };
    case 'text':
      return {
        ...base,
        content: { en: 'Enter your text here' },
        dismissible: true,
        position: { x: 50, y: 30, scale: 1, rotation: 0 },
      };
    case 'ad':
      return {
        ...base,
        advertiserName: 'Sponsor Name',
        content: { en: 'Advertisement text' },
        ctaText: { en: 'Learn More' },
        skippable: true,
        skipAfter: 3,
        timing: { ...base.timing, endTime: startTime + 8 },
        position: { x: 50, y: 85, scale: 1, rotation: 0 },
      };
    case 'landmark':
      return {
        ...base,
        content: { en: 'Landmark' },
        category: 'info',
        position: { x: 70, y: 40, scale: 1, rotation: 0 },
      };
    case 'warning':
      return {
        ...base,
        content: { en: 'Watch your step' },
        severity: 'caution',
        haptic: 'warning',
        position: { x: 50, y: 20, scale: 1, rotation: 0 },
      };
    case 'destination':
      return {
        ...base,
        content: { en: 'Destination' },
        arrived: false,
        haptic: 'arrived',
        timing: { ...base.timing, endTime: startTime + 10 },
        position: { x: 50, y: 50, scale: 1.2, rotation: 0 },
      };
    default:
      return base;
  }
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useOverlayStore = create<OverlayStore>()(
  persist(
    (set, get) => ({
      // Initial State
      overlays: [],
      selectedId: null,
      videoId: null,
      isDirty: false,
      history: [[]],
      historyIndex: 0,

      // Selection
      selectOverlay: (id) => set({ selectedId: id }),

      // Add Overlay
      addOverlay: (type, startTime) => {
        const overlay = createDefaultOverlay(type, startTime);
        set((state) => {
          const newOverlays = [...state.overlays, overlay];
          return {
            overlays: newOverlays,
            selectedId: overlay.id,
            isDirty: true,
            history: [...state.history.slice(0, state.historyIndex + 1), newOverlays],
            historyIndex: state.historyIndex + 1,
          };
        });
        return overlay.id;
      },

      // Update Overlay
      updateOverlay: (id, updates) => {
        set((state) => {
          const newOverlays = state.overlays.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          );
          return {
            overlays: newOverlays,
            isDirty: true,
            history: [...state.history.slice(0, state.historyIndex + 1), newOverlays],
            historyIndex: state.historyIndex + 1,
          };
        });
      },

      // Delete Overlay
      deleteOverlay: (id) => {
        set((state) => {
          const newOverlays = state.overlays.filter((o) => o.id !== id);
          return {
            overlays: newOverlays,
            selectedId: state.selectedId === id ? null : state.selectedId,
            isDirty: true,
            history: [...state.history.slice(0, state.historyIndex + 1), newOverlays],
            historyIndex: state.historyIndex + 1,
          };
        });
      },

      // Duplicate Overlay
      duplicateOverlay: (id) => {
        const state = get();
        const original = state.overlays.find((o) => o.id === id);
        if (!original) return null;

        const duplicate: Overlay = {
          ...original,
          id: uuid(),
          position: {
            ...original.position,
            x: Math.min(95, original.position.x + 5),
            y: Math.min(95, original.position.y + 5),
          },
          timing: {
            ...original.timing,
            startTime: original.timing.endTime,
            endTime: original.timing.endTime + (original.timing.endTime - original.timing.startTime),
          },
        };

        set((state) => {
          const newOverlays = [...state.overlays, duplicate];
          return {
            overlays: newOverlays,
            selectedId: duplicate.id,
            isDirty: true,
            history: [...state.history.slice(0, state.historyIndex + 1), newOverlays],
            historyIndex: state.historyIndex + 1,
          };
        });

        return duplicate.id;
      },

      // Bulk Operations
      setOverlays: (overlays) => {
        set({
          overlays,
          isDirty: false,
          history: [overlays],
          historyIndex: 0,
        });
      },

      clearOverlays: () => {
        set({
          overlays: [],
          selectedId: null,
          isDirty: true,
          history: [[]],
          historyIndex: 0,
        });
      },

      // Move Overlay
      moveOverlay: (id, position) => {
        set((state) => ({
          overlays: state.overlays.map((o) =>
            o.id === id ? { ...o, position: { ...o.position, ...position } } : o
          ),
          isDirty: true,
        }));
      },

      // Resize Overlay (change timing)
      resizeOverlay: (id, timing) => {
        set((state) => ({
          overlays: state.overlays.map((o) =>
            o.id === id ? { ...o, timing: { ...o.timing, ...timing } } : o
          ),
          isDirty: true,
        }));
      },

      // Update Translation
      updateTranslation: (id, field, lang, value) => {
        set((state) => ({
          overlays: state.overlays.map((o) => {
            if (o.id !== id) return o;
            const currentField = o[field] as TranslatedText | undefined;
            return {
              ...o,
              [field]: { ...currentField, [lang]: value },
            };
          }),
          isDirty: true,
        }));
      },

      // Undo
      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          set({
            overlays: state.history[state.historyIndex - 1],
            historyIndex: state.historyIndex - 1,
            isDirty: true,
          });
        }
      },

      // Redo
      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          set({
            overlays: state.history[state.historyIndex + 1],
            historyIndex: state.historyIndex + 1,
            isDirty: true,
          });
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Video
      setVideoId: (id) => set({ videoId: id }),

      // Persistence
      markClean: () => set({ isDirty: false }),
    }),
    {
      name: 'wayfind-overlays',
      partialize: (state) => ({
        overlays: state.overlays,
        videoId: state.videoId,
      }),
    }
  )
);

// ============================================
// DERIVED SELECTORS
// ============================================

export const useSelectedOverlay = () => {
  const overlays = useOverlayStore((s) => s.overlays);
  const selectedId = useOverlayStore((s) => s.selectedId);
  return overlays.find((o) => o.id === selectedId) ?? null;
};

export const useVisibleOverlays = (currentTime: number) => {
  const overlays = useOverlayStore((s) => s.overlays);
  return overlays.filter(
    (o) => currentTime >= o.timing.startTime && currentTime <= o.timing.endTime
  );
};

export const useOverlaysByType = (type: OverlayType) => {
  const overlays = useOverlayStore((s) => s.overlays);
  return overlays.filter((o) => o.type === type);
};
