import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const viewport: Viewport = {
  themeColor: '#F7C59F',
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
      className={`${plusJakarta.variable} dark h-full bg-[#03140E] text-slate-100 antialiased selection:bg-[#EE8D4B] selection:text-white overflow-x-hidden`}
    >
      <body suppressHydrationWarning className="min-h-full font-sans antialiased overflow-x-hidden bg-[#03140E] text-slate-100">
        {children}
      </body>
    </html>
  );
}


