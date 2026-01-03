'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Check, Loader2, LogOut, Copy, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';

interface WalletConnectButtonProps {
  onConnected?: () => void;
  variant?: 'default' | 'minimal' | 'hero';
  className?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'signing' | 'connected' | 'error';

export function WalletConnectButton({ 
  onConnected, 
  variant = 'default',
  className = '' 
}: WalletConnectButtonProps) {
  const { publicKey, signMessage, connected, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync connection state
  useEffect(() => {
    if (connecting) {
      setState('connecting');
    } else if (connected && publicKey) {
      // Check if we have a valid token already
      const token = api.getToken();
      if (token) {
        setState('connected');
      } else {
        // Need to sign
        handleSign();
      }
    } else if (!connected) {
      setState('disconnected');
    }
  }, [connected, connecting, publicKey]);

  const handleConnect = useCallback(() => {
    setError(null);
    // Opens the wallet selection modal directly
    setVisible(true);
  }, [setVisible]);

  const handleSign = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    setState('signing');
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

      // Get challenge from API
      const challengeRes = await api.getChallenge(walletAddress);
      if (!challengeRes.success || !challengeRes.data) {
        throw new Error('Failed to get authentication challenge');
      }

      const { message } = challengeRes.data;

      // Sign the message with the wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.encode(signatureBytes);

      // Verify signature with backend
      const verifyRes = await api.verifySignature(walletAddress, signature, message);
      if (!verifyRes.success || !verifyRes.data) {
        throw new Error('Signature verification failed');
      }

      // Store the auth token
      api.setToken(verifyRes.data.token);
      setState('connected');
      
      // Callback for parent components
      onConnected?.();
    } catch (err: any) {
      console.error('Wallet auth error:', err);
      setError(err.message || 'Authentication failed');
      setState('error');
    }
  }, [publicKey, signMessage, onConnected]);

  const handleDisconnect = useCallback(() => {
    api.setToken(null);
    disconnect();
    setShowDropdown(false);
    setState('disconnected');
  }, [disconnect]);

  const handleCopyAddress = useCallback(() => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicKey]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Hero variant - large CTA style
  if (variant === 'hero') {
    return (
      <div className={className}>
        {state === 'disconnected' && (
          <motion.button
            onClick={handleConnect}
            className="btn-chrome px-8 py-4 text-lg flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Wallet className="w-6 h-6" />
            Connect Wallet
          </motion.button>
        )}

        {state === 'connecting' && (
          <button className="btn-chrome px-8 py-4 text-lg flex items-center gap-3 opacity-80 cursor-wait">
            <Loader2 className="w-6 h-6 animate-spin" />
            Connecting...
          </button>
        )}

        {state === 'signing' && (
          <button className="btn-neon px-8 py-4 text-lg flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            Sign Message in Wallet...
          </button>
        )}

        {state === 'connected' && publicKey && (
          <motion.button
            onClick={() => setShowDropdown(!showDropdown)}
            className="bg-neon-cyan/20 border-2 border-neon-cyan rounded-lg px-6 py-4 flex items-center gap-3 text-neon-cyan font-heading font-semibold"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
            {truncateAddress(publicKey.toBase58())}
          </motion.button>
        )}

        {state === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-neon-orange">{error}</p>
            <button onClick={handleConnect} className="btn-neon px-6 py-3">
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Minimal variant - just icon when connected
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`}>
        {state === 'disconnected' && (
          <button
            onClick={handleConnect}
            className="p-2 hover:bg-white/10 rounded-lg transition text-text-secondary hover:text-neon-cyan"
            title="Connect Wallet"
          >
            <Wallet className="w-5 h-5" />
          </button>
        )}

        {(state === 'connecting' || state === 'signing') && (
          <button className="p-2 rounded-lg" disabled>
            <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
          </button>
        )}

        {state === 'connected' && publicKey && (
          <>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-1 hover:bg-surface-2 rounded-lg transition"
            >
              <div className="w-2 h-2 rounded-full bg-neon-green" />
              <span className="text-sm font-mono text-text-primary">
                {truncateAddress(publicKey.toBase58())}
              </span>
            </button>

            <AnimatePresence>
              {showDropdown && (
                <WalletDropdown
                  address={publicKey.toBase58()}
                  onCopy={handleCopyAddress}
                  onDisconnect={handleDisconnect}
                  copied={copied}
                  onClose={() => setShowDropdown(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}

        {state === 'error' && (
          <button
            onClick={handleConnect}
            className="p-2 hover:bg-red-500/20 rounded-lg transition text-neon-orange"
            title={error || 'Connection failed - click to retry'}
          >
            <Wallet className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`relative ${className}`}>
      {state === 'disconnected' && (
        <motion.button
          onClick={handleConnect}
          className="btn-neon px-6 py-2.5 flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </motion.button>
      )}

      {state === 'connecting' && (
        <button className="btn-neon px-6 py-2.5 flex items-center gap-2 opacity-80 cursor-wait">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </button>
      )}

      {state === 'signing' && (
        <button className="btn-neon px-6 py-2.5 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Sign Message...
        </button>
      )}

      {state === 'connected' && publicKey && (
        <>
          <motion.button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-1 hover:bg-surface-2 border border-neon-cyan/30 rounded-lg transition-all"
            whileHover={{ borderColor: 'rgba(4, 217, 255, 0.6)' }}
          >
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-sm font-mono text-text-primary">
              {truncateAddress(publicKey.toBase58())}
            </span>
          </motion.button>

          <AnimatePresence>
            {showDropdown && (
              <WalletDropdown
                address={publicKey.toBase58()}
                onCopy={handleCopyAddress}
                onDisconnect={handleDisconnect}
                copied={copied}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleConnect}
            className="btn-neon px-6 py-2.5 flex items-center gap-2 border-neon-orange text-neon-orange"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Wallet className="w-4 h-4" />
            Retry
          </motion.button>
        </div>
      )}
    </div>
  );
}

// Dropdown component for connected state
function WalletDropdown({
  address,
  onCopy,
  onDisconnect,
  copied,
  onClose,
}: {
  address: string;
  onCopy: () => void;
  onDisconnect: () => void;
  copied: boolean;
  onClose: () => void;
}) {
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-wallet-dropdown]')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      data-wallet-dropdown
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-64 bg-surface-1 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
    >
      {/* Address display */}
      <div className="p-4 border-b border-white/10">
        <p className="text-xs text-text-tertiary mb-1">Connected Wallet</p>
        <p className="font-mono text-sm text-text-primary break-all">{address}</p>
      </div>

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={onCopy}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-left"
        >
          {copied ? (
            <Check className="w-4 h-4 text-neon-green" />
          ) : (
            <Copy className="w-4 h-4 text-text-secondary" />
          )}
          <span className="text-sm text-text-primary">
            {copied ? 'Copied!' : 'Copy Address'}
          </span>
        </button>

        <a
          href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
        >
          <ExternalLink className="w-4 h-4 text-text-secondary" />
          <span className="text-sm text-text-primary">View on Explorer</span>
        </a>

        <button
          onClick={onDisconnect}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition text-left group"
        >
          <LogOut className="w-4 h-4 text-text-secondary group-hover:text-red-500 transition" />
          <span className="text-sm text-text-primary group-hover:text-red-500 transition">
            Disconnect
          </span>
        </button>
      </div>
    </motion.div>
  );
}

export default WalletConnectButton;
