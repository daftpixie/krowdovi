'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MapPin, Play, Shield, Coins, Users, 
  ArrowRight, Zap, Globe, Footprints, Video, Navigation, Smartphone
} from 'lucide-react';
import Link from 'next/link';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleConnected = () => {
    setIsAuthenticated(true);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-deepest overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 h-16 border-b border-white/10 bg-surface-1/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neon-cyan flex items-center justify-center">
              <MapPin className="w-5 h-5 text-bg-deepest" />
            </div>
            <span className="font-display font-bold text-xl text-text-primary tracking-wide">
              Wayfind
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-text-secondary hover:text-neon-cyan transition text-sm font-body">
              Features
            </Link>
            <Link href="#creators" className="text-text-secondary hover:text-neon-cyan transition text-sm font-body">
              For Creators
            </Link>
            <Link href="#venues" className="text-text-secondary hover:text-neon-cyan transition text-sm font-body">
              For Venues
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <button className="btn-neon px-4 py-2 text-sm">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2 inline" />
                </button>
              </Link>
            ) : (
              <WalletConnectButton 
                onConnected={handleConnected}
                variant="default"
              />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-8">
              <Zap className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-neon-cyan font-medium font-body">
                DePIN-Powered Navigation
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-display font-black text-text-primary mb-6 leading-tight tracking-tight">
              Navigate <span className="text-chrome">Anywhere</span>
              <br />
              <span className="text-glow text-neon-cyan">Earn Everywhere</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12 font-body">
              Video-based indoor navigation with motion-aware playback. 
              Create routes, earn $FIND tokens, and help others find their way.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/creator-studio">
                    <motion.button
                      className="btn-chrome px-8 py-4 text-lg flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Play className="w-5 h-5" />
                      Create a Route
                    </motion.button>
                  </Link>
                  <Link href="/explore">
                    <button className="btn-neon px-8 py-4 text-lg">
                      Explore Routes
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <WalletConnectButton 
                    onConnected={handleConnected}
                    variant="hero"
                  />
                  <Link href="/explore">
                    <button className="btn-neon px-8 py-4 text-lg">
                      Browse as Guest
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { value: '500+', label: 'Routes Created' },
                { value: '12K', label: 'Navigations' },
                { value: '45', label: 'Venues' },
                { value: '$2.3K', label: 'Creator Earnings' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-display font-bold text-neon-cyan">
                    {stat.value}
                  </p>
                  <p className="text-sm text-text-tertiary mt-1 font-body">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* App Demo Section - Static, not floating */}
      <section className="relative z-10 py-20 px-4 bg-gradient-to-b from-transparent via-surface-1/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Device mockup - Now static and contained */}
            <div className="flex justify-center">
              <div className="relative w-72 h-[500px] bg-surface-1 rounded-[3rem] border-4 border-surface-2 shadow-2xl">
                {/* Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-surface-2 rounded-full" />
                {/* Screen */}
                <div className="absolute inset-4 top-12 bg-bg-deepest rounded-[2rem] overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Navigation view */}
                    <div className="flex-1 bg-gradient-to-b from-surface-2 to-bg-deepest flex items-center justify-center relative">
                      {/* Video placeholder with play icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-surface-2/50 flex items-center justify-center">
                          <Video className="w-12 h-12 text-text-tertiary" />
                        </div>
                      </div>
                      {/* Direction indicator */}
                      <motion.div
                        className="absolute w-20 h-20 rounded-full bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center z-10"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Navigation className="w-10 h-10 text-neon-cyan" />
                      </motion.div>
                    </div>
                    {/* Direction card */}
                    <div className="p-4 bg-surface-1 border-t border-white/10">
                      <p className="text-sm text-neon-cyan font-display font-semibold">Turn Right in 10m</p>
                      <p className="text-xs text-text-tertiary font-body">Toward Radiology Department</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature description */}
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-6">
                Video-Based
                <br />
                <span className="text-neon-cyan">Indoor Navigation</span>
              </h2>
              
              <p className="text-text-secondary mb-8 font-body">
                Unlike traditional map-based navigation, Wayfind shows you exactly what you'll see 
                as you walk. Motion-aware playback means the video follows your pace.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Video, title: 'Real Video Guidance', desc: 'See exactly what to look for at each turn' },
                  { icon: Footprints, title: 'Motion-Aware Playback', desc: 'Video syncs with your walking pace' },
                  { icon: Smartphone, title: 'No App Required', desc: 'Works instantly via NFC or QR code' },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-text-primary">{feature.title}</p>
                      <p className="text-sm text-text-tertiary font-body">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="features" className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold text-text-primary mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto font-body">
              Simple, intuitive navigation that follows you as you walk
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Smartphone,
                title: 'Scan & Start',
                description: 'Scan an NFC tag or QR code at any venue entrance to begin navigation.',
                color: 'neon-cyan',
              },
              {
                step: '02',
                icon: Play,
                title: 'Watch & Walk',
                description: 'Follow the video as it plays. Motion sensors sync playback to your pace.',
                color: 'neon-green',
              },
              {
                step: '03',
                icon: MapPin,
                title: 'Arrive Confident',
                description: 'Reach your destination without wrong turns or confusion.',
                color: 'neon-purple',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card-surface p-8 text-center hover:border-neon-cyan/30 transition-colors"
              >
                <div className={`w-16 h-16 rounded-2xl bg-${item.color}/10 border border-${item.color}/30 flex items-center justify-center mx-auto mb-6`}>
                  <item.icon className={`w-8 h-8 text-${item.color}`} />
                </div>
                <p className={`text-sm font-mono text-${item.color} mb-2`}>{item.step}</p>
                <h3 className="text-xl font-heading font-bold text-text-primary mb-3">
                  {item.title}
                </h3>
                <p className="text-text-secondary font-body">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section id="creators" className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/30 mb-6">
                <Coins className="w-4 h-4 text-neon-green" />
                <span className="text-sm text-neon-green font-medium font-body">
                  Earn $FIND Tokens
                </span>
              </div>

              <h2 className="text-4xl font-display font-bold text-text-primary mb-6">
                Create Routes,
                <br />
                <span className="text-neon-green">Earn Rewards</span>
              </h2>

              <p className="text-text-secondary mb-8 font-body">
                Record navigation videos at your local hospital, airport, or mall. 
                When users navigate with your content, you earn $FIND tokens 
                based on your reputation score.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Up to 2.5x earnings multiplier for top creators',
                  'Weekly token distributions via burn-and-mint',
                  'Build your reputation with quality content',
                  'Join venue partnerships for bonus rewards',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-neon-green" />
                    </div>
                    <span className="text-text-secondary font-body">{item}</span>
                  </li>
                ))}
              </ul>

              {isAuthenticated ? (
                <Link href="/creator-studio">
                  <button className="btn-neon px-8 py-4">
                    Open Creator Studio
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </button>
                </Link>
              ) : (
                <WalletConnectButton 
                  onConnected={handleConnected}
                  variant="default"
                />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Creator dashboard preview */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-text-primary">Creator Dashboard</p>
                    <p className="text-sm text-text-tertiary font-body">Gold Tier - 1.5x Multiplier</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'This Week', value: '1,234', sub: 'views' },
                    { label: 'Earnings', value: '45.2', sub: 'FIND' },
                    { label: 'Routes', value: '12', sub: 'published' },
                    { label: 'Rating', value: '4.8', sub: 'avg' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-2/50 rounded-lg p-4">
                      <p className="text-xs text-text-tertiary font-body">{stat.label}</p>
                      <p className="text-2xl font-display font-bold text-text-primary">
                        {stat.value}
                      </p>
                      <p className="text-xs text-text-tertiary font-body">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-sm text-neon-green font-body">
                    +23% from last week
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Venue Section */}
      <section id="venues" className="relative z-10 py-32 px-4 bg-surface-1/30">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/30 mb-6">
              <Globe className="w-4 h-4 text-neon-purple" />
              <span className="text-sm text-neon-purple font-medium font-body">
                Venue Partners
              </span>
            </div>

            <h2 className="text-4xl font-display font-bold text-text-primary mb-6">
              Help Visitors Navigate
              <br />
              <span className="text-neon-purple">Your Space</span>
            </h2>

            <p className="text-text-secondary max-w-2xl mx-auto mb-12 font-body">
              Deploy NFC tags and QR codes throughout your venue. 
              Visitors get instant, video-based directions without downloading an app.
            </p>

            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                { icon: '🏥', label: 'Hospitals' },
                { icon: '✈️', label: 'Airports' },
                { icon: '🛒', label: 'Malls' },
                { icon: '🏛️', label: 'Museums' },
              ].map((venue, i) => (
                <motion.div
                  key={venue.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card-surface p-6 hover:border-neon-purple/30 transition-colors"
                >
                  <span className="text-4xl mb-3 block">{venue.icon}</span>
                  <p className="font-heading font-bold text-text-primary">{venue.label}</p>
                </motion.div>
              ))}
            </div>

            <Link href="mailto:venues@wayfind.xyz">
              <button className="btn-neon px-8 py-4">
                Partner With Us
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neon-cyan flex items-center justify-center">
              <MapPin className="w-4 h-4 text-bg-deepest" />
            </div>
            <span className="font-display font-bold text-text-primary">Wayfind</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-text-tertiary font-body">
            <Link href="/terms" className="hover:text-text-primary transition">Terms</Link>
            <Link href="/privacy" className="hover:text-text-primary transition">Privacy</Link>
            <Link href="/docs" className="hover:text-text-primary transition">Docs</Link>
            <a href="https://twitter.com/wayfind" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition">
              Twitter
            </a>
          </div>

          <p className="text-sm text-text-tertiary font-body">
            © 2026 Wayfind Protocol
          </p>
        </div>
      </footer>
    </div>
  );
}
