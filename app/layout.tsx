import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const viewport: Viewport = {
  themeColor: '#004266',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'La Maison de la Fiscalité — Gestion, Calendrier & Revue Métier',
  description:
    'Espace collaboratif de La Maison de la Fiscalité : pilotage des tâches, calendrier des échéances fiscales et plateforme de revue métier.',
  applicationName: 'La Maison de la Fiscalité',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'La Maison de la Fiscalité',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/logos/logo-normal-512.png', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'La Maison de la Fiscalité — Gestion, Calendrier & Revue Métier',
    description:
      'Espace collaboratif de La Maison de la Fiscalité : pilotage des tâches, calendrier des échéances et revue métier.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Maison de la Fiscalité — Gestion, Calendrier & Revue Métier',
    description:
      'Espace collaboratif de La Maison de la Fiscalité : tâches, échéances fiscales et revue métier.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${plusJakarta.variable} h-full bg-[#F4F7FA] dark:bg-[#061826] text-[#0B1F30] dark:text-slate-100 antialiased selection:bg-[#F77F00] selection:text-white overflow-x-hidden`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full font-sans antialiased overflow-x-hidden bg-[#F4F7FA] dark:bg-[#061826] text-[#0B1F30] dark:text-slate-100 transition-colors duration-200"
      >
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Script src="/pwa-install-capture.js" strategy="beforeInteractive" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
