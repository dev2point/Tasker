import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Gestionnaire de Tâches & Calendrier avec Rappels Automatiques',
  description: 'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif.',
  openGraph: {
    title: 'Gestionnaire de Tâches & Calendrier avec Rappels Automatiques',
    description: 'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestionnaire de Tâches & Calendrier avec Rappels Automatiques',
    description: 'Organisez vos journées, suivez vos échéances et ne manquez aucun rappel grâce au calendrier interactif.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      <body suppressHydrationWarning className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
