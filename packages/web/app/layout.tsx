import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FlowSpace — Browser Workspace Manager',
    template: '%s | FlowSpace',
  },
  description:
    'Turn your browser into a tiling workspace manager. Organize multiple websites side-by-side, switch contexts instantly, and stay in flow.',
  keywords: ['browser extension', 'workspace manager', 'productivity', 'tiling', 'tab manager'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'FlowSpace',
    title: 'FlowSpace — Browser Workspace Manager',
    description:
      'Turn your browser into a tiling workspace manager. Organize multiple websites side-by-side, switch contexts instantly, and stay in flow.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
