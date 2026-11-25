import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'La Maison de la Fiscalité — Tâches & Revue Métier',
    short_name: 'LMF Fiscalité',
    description:
      'Plateforme de pilotage des tâches, échéances fiscales et revue métier de La Maison de la Fiscalité.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F4F7FA',
    theme_color: '#004266',
    lang: 'fr',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business'],
    shortcuts: [
      {
        name: 'Nouvelle Tâche',
        short_name: 'Ajouter',
        description: 'Créer rapidement une nouvelle tâche',
        url: '/?action=new-task',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Calendrier',
        short_name: 'Agenda',
        description: 'Consulter la vue calendrier',
        url: '/?view=calendar',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
      },
    ],
    ...(process.env.APP_URL?.startsWith('https://')
      ? {
          related_applications: [
            {
              platform: 'webapp',
              url: `${process.env.APP_URL.replace(/\/$/, '')}/manifest.webmanifest`,
            },
          ],
        }
      : {}),
  };
}
