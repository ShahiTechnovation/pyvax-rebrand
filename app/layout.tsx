import type { Metadata } from 'next'
import { Geist, Geist_Mono, Space_Grotesk, Inter, Press_Start_2P, DM_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700']
});
const _inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700']
});
const _pressStart = Press_Start_2P({
  subsets: ["latin"],
  variable: '--font-press-start',
  weight: '400'
});
const _dmMono = DM_Mono({
  subsets: ["latin"],
  variable: '--font-dm-mono',
  weight: ['300', '400', '500']
});

const _ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: '--font-ibm-plex',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'PyVax - Ship Avalanche Smart Contracts in Python',
  description: 'PyVax transpiles your Python into EVM bytecode so you can deploy from CLI or browser without learning Solidity.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  metadataBase: new URL('https://pyvax.dev'),
  openGraph: {
    title: 'PyVax - Ship Avalanche Smart Contracts in Python',
    description: 'Write smart contracts in Python, deploy to Avalanche C-Chain in seconds.',
    url: 'https://pyvax.dev',
    siteName: 'PyVax',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${_spaceGrotesk.variable} ${_inter.variable} ${_pressStart.variable} ${_dmMono.variable} ${_ibmPlexSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased dark bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
