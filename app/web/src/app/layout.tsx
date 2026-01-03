import type { Metadata } from 'next';
import { Providers } from '@/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wayfind - Indoor Navigation DePIN',
  description: 'Video-based indoor navigation powered by blockchain rewards',
  keywords: ['navigation', 'indoor', 'wayfinding', 'DePIN', 'blockchain', 'Solana'],
  authors: [{ name: '24HRMVP' }],
  openGraph: {
    title: 'Wayfind - Indoor Navigation DePIN',
    description: 'Video-based indoor navigation powered by blockchain rewards',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-deepest">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
