'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegister: React.FC = () => {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PlanIt ServiceWorker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('PlanIt ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
};
