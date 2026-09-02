import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'PlanIt - Tâches, Calendrier & Rappels Intelligents',
  description:
    'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif et au mode hors-ligne.',
  applicationName: 'PlanIt',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PlanIt',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'PlanIt - Tâches, Calendrier & Rappels Intelligents',
    description:
      'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif et au mode hors-ligne.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlanIt - Tâches, Calendrier & Rappels Intelligents',
    description:
      'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white"
    >
      <body suppressHydrationWarning className="min-h-full font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

