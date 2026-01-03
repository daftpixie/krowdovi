// ============================================
// WAYFIND MVP - SHARED TYPES
// Indoor Navigation DePIN Platform
// ============================================

// ============================================
// OVERLAY TYPES
// ============================================

export type OverlayType = 'arrow' | 'text' | 'ad' | 'landmark' | 'warning' | 'destination';

export type ArrowDirection = 
  | 'straight' 
  | 'left' 
  | 'right' 
  | 'slight-left' 
  | 'slight-right' 
  | 'u-turn' 
  | 'up-stairs' 
  | 'down-stairs' 
  | 'elevator' 
  | 'escalator';

export type HapticPattern = 
  | 'turn-left' 
  | 'turn-right' 
  | 'straight' 
  | 'arrived' 
  | 'warning' 
  | 'attention';

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
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
  scale?: number; // 0.5-2.0, default 1
  rotation?: number; // degrees, default 0
}

export interface OverlayTiming {
  startTime: number; // seconds from video start
  endTime: number; // seconds from video start
  fadeIn?: number; // milliseconds, default 200
  fadeOut?: number; // milliseconds, default 200
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

// Base overlay interface
export interface BaseOverlay {
  id: string;
  type: OverlayType;
  position: OverlayPosition;
  timing: OverlayTiming;
  style?: OverlayStyle;
  haptic?: HapticPattern;
  ttsText?: TranslatedText; // Text-to-speech content
  accessibilityLabel?: TranslatedText;
}

// Arrow overlay for navigation directions
export interface ArrowOverlay extends BaseOverlay {
  type: 'arrow';
  direction: ArrowDirection;
  distance?: number; // meters to next waypoint
  distanceUnit?: 'meters' | 'feet';
  animated?: boolean;
}

// Text popup overlay for information
export interface TextOverlay extends BaseOverlay {
  type: 'text';
  content: TranslatedText;
  title?: TranslatedText;
  icon?: string; // icon name from icon set
  dismissible?: boolean;
  autoHide?: boolean;
}

// Advertisement overlay
export interface AdOverlay extends BaseOverlay {
  type: 'ad';
  adId: string;
  advertiserName: string;
  content: TranslatedText;
  imageUrl?: string;
  ctaText?: TranslatedText;
  ctaUrl?: string;
  impressionTracking?: string;
  clickTracking?: string;
  skippable?: boolean;
  skipAfter?: number; // seconds before skip button appears
}

// Landmark overlay for points of interest
export interface LandmarkOverlay extends BaseOverlay {
  type: 'landmark';
  name: TranslatedText;
  description?: TranslatedText;
  icon?: string;
  category?: 'restroom' | 'elevator' | 'exit' | 'info' | 'food' | 'shop' | 'medical' | 'custom';
}

// Warning overlay for hazards or changes
export interface WarningOverlay extends BaseOverlay {
  type: 'warning';
  severity: 'info' | 'caution' | 'warning' | 'danger';
  message: TranslatedText;
  icon?: string;
}

// Destination overlay for arrival
export interface DestinationOverlay extends BaseOverlay {
  type: 'destination';
  name: TranslatedText;
  arrived: boolean;
  icon?: string;
}

// Union type for all overlays
export type Overlay = 
  | ArrowOverlay 
  | TextOverlay 
  | AdOverlay 
  | LandmarkOverlay 
  | WarningOverlay 
  | DestinationOverlay;

// ============================================
// VIDEO & ROUTE TYPES
// ============================================

export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  fileSize: number; // bytes
  uploadedAt: string;
  processedAt?: string;
}

export interface VideoUrls {
  original?: string;
  hls: string; // HLS manifest URL
  dash?: string; // DASH manifest URL
  thumbnail: string;
  poster?: string;
  preview?: string; // short preview clip
}

export interface RouteMetadata {
  id: string;
  venueId: string;
  name: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  floor?: string;
  building?: string;
  estimatedTime: number; // seconds
  distance: number; // meters
  difficulty: 'easy' | 'moderate' | 'challenging';
  accessibility: AccessibilityFeatures;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessibilityFeatures {
  wheelchairAccessible: boolean;
  hasElevator: boolean;
  hasStairs: boolean;
  hasRamps: boolean;
  audioGuidance: boolean;
  hapticFeedback: boolean;
  highContrast: boolean;
  largeText: boolean;
}

export interface NavigationVideo {
  id: string;
  routeId: string;
  creatorId: string;
  venueId: string;
  status: 'draft' | 'processing' | 'published' | 'archived' | 'rejected';
  video: VideoMetadata;
  urls: VideoUrls;
  overlays: Overlay[];
  route: RouteMetadata;
  stats: VideoStats;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface VideoStats {
  views: number;
  completions: number;
  avgCompletionRate: number;
  avgRating: number;
  totalRatings: number;
  weeklyViews: number;
  monthlyViews: number;
}

// ============================================
// VENUE TYPES
// ============================================

export type VenueType = 
  | 'hospital' 
  | 'airport' 
  | 'mall' 
  | 'university' 
  | 'hotel' 
  | 'transit' 
  | 'corporate' 
  | 'museum' 
  | 'stadium' 
  | 'convention' 
  | 'other';

export interface VenueLocation {
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  description?: string;
  location: VenueLocation;
  logoUrl?: string;
  imageUrl?: string;
  website?: string;
  operatingHours?: OperatingHours;
  floors: string[];
  buildings?: string[];
  totalRoutes: number;
  totalVideos: number;
  avgRating: number;
  bountyActive: boolean;
  bountyAmount?: number;
  bountyRoutes?: string[];
  isVerified: boolean;
  adminIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
  holidays?: string;
}

export interface DayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  closed?: boolean;
}

// ============================================
// USER & CREATOR TYPES
// ============================================

export type UserRole = 'user' | 'creator' | 'venue_admin' | 'platform_admin';

export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface Creator extends User {
  role: 'creator';
  bio?: string;
  website?: string;
  socialLinks?: SocialLinks;
  stats: CreatorStats;
  reputation: ReputationScore;
  tier: CreatorTier;
  payoutAddress: string;
  totalEarnings: number;
  pendingEarnings: number;
  isVerified: boolean;
  venueAffiliations?: string[];
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  farcaster?: string;
}

export interface CreatorStats {
  totalVideos: number;
  publishedVideos: number;
  totalViews: number;
  totalCompletions: number;
  avgRating: number;
  totalRatings: number;
  weeklyViews: number;
  monthlyViews: number;
  lifetimeEarnings: number;
}

export interface ReputationScore {
  overall: number; // 0-100
  freshness: number; // 0-100, how recent videos are
  completionRate: number; // 0-100, avg video completion
  userRating: number; // 0-100, derived from 5-star ratings
  accessibility: number; // 0-100, accessibility features score
  noBounce: number; // 0-100, users don't leave early
  lastUpdated: string;
}

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierConfig {
  tier: CreatorTier;
  minReputation: number;
  multiplier: number;
  benefits: string[];
}

export const TIER_CONFIGS: TierConfig[] = [
  { tier: 'bronze', minReputation: 0, multiplier: 0.5, benefits: ['Basic payouts'] },
  { tier: 'silver', minReputation: 40, multiplier: 1.0, benefits: ['Standard payouts', 'Analytics dashboard'] },
  { tier: 'gold', minReputation: 60, multiplier: 1.5, benefits: ['1.5x payouts', 'Priority support', 'Badge'] },
  { tier: 'platinum', minReputation: 80, multiplier: 2.0, benefits: ['2x payouts', 'Featured placement', 'Early access'] },
  { tier: 'diamond', minReputation: 95, multiplier: 2.5, benefits: ['2.5x payouts', 'DAO voting power', 'Exclusive events'] },
];

// ============================================
// TOKENOMICS TYPES
// ============================================

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: bigint;
  mintAuthority: string;
  burnRatio: number; // 0.75 = 75% burned
  remintRatio: number; // 0.25 = 25% reminted to creators
  weeklyRemintCap: bigint;
}

export interface TokenBalance {
  wallet: string;
  balance: bigint;
  credits: number;
  stakedBalance?: bigint;
  pendingRewards?: bigint;
}

export interface BurnEvent {
  id: string;
  txSignature: string;
  wallet: string;
  amount: bigint;
  creditsPurchased: number;
  burnedAmount: bigint;
  remintPoolAmount: bigint;
  timestamp: string;
}

export interface RewardDistribution {
  id: string;
  txSignature: string;
  epoch: number;
  weekStarting: string;
  weekEnding: string;
  totalReminted: bigint;
  totalBurned: bigint;
  recipientCount: number;
  distributions: CreatorReward[];
  timestamp: string;
}

export interface CreatorReward {
  creatorId: string;
  walletAddress: string;
  reputationScore: number;
  tierMultiplier: number;
  viewsThisWeek: number;
  baseReward: bigint;
  finalReward: bigint;
  txSignature?: string;
}

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// MOTION DETECTION TYPES
// ============================================

export interface MotionState {
  isWalking: boolean;
  speed: number; // estimated m/s
  direction: number; // degrees, 0 = forward
  confidence: number; // 0-1
  lastUpdate: number; // timestamp
}

export interface MotionConfig {
  walkThreshold: number; // g-force above baseline
  sustainedMotionMs: number; // ms to confirm walking
  stoppedConfirmMs: number; // ms to confirm stopped
  sampleRate: number; // Hz
  smoothingWindow: number; // samples for filtering
}

export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  walkThreshold: 0.3,
  sustainedMotionMs: 1500,
  stoppedConfirmMs: 2000,
  sampleRate: 50,
  smoothingWindow: 10,
};

// ============================================
// NAVIGATION SESSION TYPES
// ============================================

export interface NavigationSession {
  id: string;
  userId?: string;
  videoId: string;
  venueId: string;
  startedAt: string;
  endedAt?: string;
  completed: boolean;
  completionPercentage: number;
  rating?: number;
  feedback?: string;
  deviceInfo: DeviceInfo;
  accessMethod: 'nfc' | 'qr' | 'link' | 'app';
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  browser?: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  screenWidth: number;
  screenHeight: number;
  hasMotion: boolean;
  hasHaptics: boolean;
  hasTts: boolean;
}

// ============================================
// NFC & QR TYPES
// ============================================

export interface NfcTag {
  id: string;
  venueId: string;
  location: string;
  floor?: string;
  routeIds: string[];
  url: string;
  createdAt: string;
  lastScanned?: string;
  scanCount: number;
}

export interface QrCode {
  id: string;
  venueId: string;
  location: string;
  routeIds: string[];
  url: string;
  imageUrl: string;
  createdAt: string;
  scanCount: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface VenueAnalytics {
  venueId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalSessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  completionRate: number;
  avgRating: number;
  topRoutes: RouteAnalytics[];
  accessMethodBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
}

export interface RouteAnalytics {
  routeId: string;
  routeName: string;
  sessions: number;
  completionRate: number;
  avgRating: number;
}

export interface CreatorAnalytics {
  creatorId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalViews: number;
  totalCompletions: number;
  totalEarnings: number;
  topVideos: VideoAnalytics[];
  ratingTrend: number[];
  viewsTrend: number[];
}

export interface VideoAnalytics {
  videoId: string;
  title: string;
  views: number;
  completions: number;
  avgRating: number;
  earnings: number;
}

// ============================================
// EXPORT INDEX
// ============================================

export * from './index';
