# Wayfind MVP

**Indoor Navigation DePIN Platform**

Blockchain-powered platform paying videographers to create first-person navigation videos for complex indoor spaces like hospitals, airports, and malls.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)
![Solana](https://img.shields.io/badge/Solana-Anchor-purple.svg)

## 🎯 Overview

Wayfind applies Hivemapper's successful burn-and-mint tokenomics to the $7B indoor navigation market. Users burn tokens for navigation credits while creators earn from the remint pool based on their content's usage and reputation.

### Key Features

- **Motion-Controlled Playback**: Video plays when walking, pauses when stopped
- **Multi-language Overlays**: AI-powered translation for navigation arrows and text
- **Creator Studio**: Drag-and-drop overlay editor for navigation videos
- **Burn-and-Mint Tokenomics**: 75% burned, 25% to creator rewards
- **Reputation System**: 5-tier system with earnings multipliers (0.5x - 2.5x)
- **NFC/QR Access**: Tap or scan to start navigation instantly

## 📦 Architecture

```
wayfind-mvp/
├── packages/
│   ├── api/           # Express 5 backend
│   ├── web/           # Next.js 14 frontend
│   ├── contracts/     # Solana Anchor programs
│   └── shared/        # TypeScript types
└── scripts/           # Deployment utilities
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Express 5, Prisma, PostgreSQL, Redis |
| Blockchain | Solana, Anchor, SPL Token |
| Video | Cloudflare Stream (HLS), hls.js |
| Auth | Solana Wallet Adapter, JWT |

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x
- pnpm 8.x
- PostgreSQL 16.x
- Solana CLI (for contracts)

### Installation

```bash
# Clone repository
git clone https://github.com/wayfind/wayfind-mvp.git
cd wayfind-mvp

# Install dependencies
pnpm install

# Setup environment
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Run database migrations
cd packages/api
pnpm prisma migrate dev

# Start development servers
pnpm dev
```

### Environment Variables

**API (`packages/api/.env`)**
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
SOLANA_RPC_URL=https://api.devnet.solana.com
ANTHROPIC_API_KEY=xxx
```

**Web (`packages/web/.env`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

## 📊 Tokenomics

### Burn-and-Mint Model

When users purchase navigation credits:
- **75% burned** (permanently destroyed)
- **25% to remint pool** (distributed weekly to creators)
- **500K weekly cap** on reminted tokens

### Creator Tiers

| Tier | Score Range | Multiplier |
|------|-------------|------------|
| Bronze | < 40 | 0.5x |
| Silver | 40-59 | 1.0x |
| Gold | 60-79 | 1.5x |
| Platinum | 80-94 | 2.0x |
| Diamond | 95+ | 2.5x |

### Reputation Metrics

- **Freshness (30%)**: Recent video updates
- **Completion Rate (25%)**: Users finishing navigation
- **User Rating (25%)**: 5-star feedback
- **Accessibility (10%)**: Overlay quality
- **No Bounce (10%)**: Session retention

## 🎬 Creator Studio

The overlay editor supports:

- **Navigation Arrows**: 10 directions with distance
- **Text Popups**: Multi-language with TTS
- **Landmarks**: POI markers with icons
- **Warnings**: 4 severity levels
- **Advertisements**: Revenue-sharing spots
- **Destinations**: Arrival confirmations

### Overlay Properties

- Position (x/y percentage)
- Timing (start/end with fades)
- Scale and rotation
- Haptic feedback patterns
- Accessibility (ARIA, TTS)

## 📱 Navigation Experience

### Access Methods

1. **NFC Tag**: Tap NTAG213 to start
2. **QR Code**: Scan to open navigation
3. **Direct Link**: Share URL
4. **App Clip**: iOS instant experience

### Motion Detection

- DeviceMotion API at 50Hz
- 0.3g walking threshold
- 1.5s sustained to confirm walking
- 2.0s stopped to pause

### Accessibility

- Text-to-speech for overlays
- Haptic feedback patterns
- High contrast overlays
- Multi-language support (11+)

## 🔌 API Endpoints

### Authentication
- `POST /auth/challenge` - Get signing challenge
- `POST /auth/verify` - Verify wallet signature
- `GET /auth/me` - Get current user

### Videos
- `GET /videos` - List with filters
- `GET /videos/:id` - Get with overlays
- `POST /videos` - Create new video
- `POST /videos/:id/rate` - Submit rating

### Overlays
- `GET /overlays?videoId=X` - List for video
- `POST /overlays` - Create overlay
- `POST /overlays/bulk` - Batch create
- `PATCH /overlays/:id` - Update

### Tokens
- `GET /tokens/config` - Get tokenomics config
- `POST /tokens/burn` - Record burn event
- `POST /tokens/distribute` - Weekly distribution
- `POST /tokens/claim` - Claim rewards

## 🏗️ Deployment

### Railway Setup

```bash
# Login to Railway
railway login

# Create project
railway init

# Add services
railway add -s api
railway add -s web
railway add -s postgres
railway add -s redis

# Deploy
./scripts/deploy.sh production
```

### Solana Deployment

```bash
cd packages/contracts

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## 🧪 Testing

```bash
# API tests
cd packages/api
pnpm test

# Web tests
cd packages/web
pnpm test

# Contract tests
cd packages/contracts
anchor test
```

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

Built with ❤️ for the 24HRMVP ecosystem
