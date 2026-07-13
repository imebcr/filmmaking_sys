import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Zidny — Agency Platform',
  description: 'Agency Project & Team Management Platform',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zidny" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a60ad" />
      </head>
      <body>
        <SessionProviderWrapper>
          <AuthProvider>
            <AppProvider>{children}</AppProvider>
          </AuthProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
