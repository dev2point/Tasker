'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegister: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Suppress repetitive [HMR] connected console log spam
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('[HMR] connected') || args[0].includes('[HMR]'))
      ) {
        return;
      }
      originalLog(...args);
    };

    if (
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      const registerServiceWorker = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(() => {
            // Service worker registered successfully
          })
          .catch((error) => {
            console.warn('PlanIt ServiceWorker registration failed:', error);
          });
      };

      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
        return () => window.removeEventListener('load', registerServiceWorker);
      }
    }
  }, []);

  return null;
};

