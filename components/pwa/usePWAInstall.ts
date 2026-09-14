'use client';

import { useSyncExternalStore, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notifyPromptListeners() {
  promptListeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem('planit_pwa_installed', 'true');
    } catch {
      // ignore
    }
    notifyPromptListeners();
  });
}

function subscribePrompt(cb: () => void) {
  promptListeners.add(cb);
  return () => {
    promptListeners.delete(cb);
  };
}

function subscribeMatchMedia(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', cb);
  return () => media.removeEventListener('change', cb);
}

interface ClientInfo {
  isIOS: boolean;
  isDesktop: boolean;
  isMac: boolean;
  isWindows: boolean;
  isAndroid: boolean;
  browser: string;
  platformName: string;
  isBrowserCompatible: boolean;
}

const defaultClientInfo: ClientInfo = {
  isIOS: false,
  isDesktop: true,
  isMac: false,
  isWindows: false,
  isAndroid: false,
  browser: 'other',
  platformName: 'Appareil',
  isBrowserCompatible: false,
};

let cachedClientInfo: ClientInfo | null = null;

function getClientInfo(): ClientInfo {
  if (typeof window === 'undefined') {
    return defaultClientInfo;
  }
  if (cachedClientInfo) {
    return cachedClientInfo;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
  const isWindows = /windows|win32|win64/.test(ua);
  const isLinux = /linux/.test(ua) && !isAndroid;
  const isDesktop = !isIOS && !isAndroid;

  // In-app browsers detection (Facebook, Instagram, LinkedIn, etc.)
  const isInApp = /fban|fbav|instagram|linkedin|tiktok|snapchat|line\/|micromessenger/.test(ua);

  // Browser detection
  const isEdge = /edg\//.test(ua);
  const isOpera = /opr\/|opera/.test(ua);
  const isChrome = /chrome\//.test(ua) && !isEdge && !isOpera;
  const isSafari = /safari/.test(ua) && !isChrome && !isEdge && !isOpera;
  const isFirefox = /firefox/.test(ua);

  let browser = 'other';
  if (isEdge) browser = 'edge';
  else if (isOpera) browser = 'opera';
  else if (isChrome) browser = 'chrome';
  else if (isSafari) browser = 'safari';
  else if (isFirefox) browser = 'firefox';

  let platformName = 'Appareil';
  if (isWindows) platformName = 'Windows';
  else if (isMac) platformName = 'Mac';
  else if (isAndroid) platformName = 'Android';
  else if (isIOS) platformName = 'iPhone / iPad';
  else if (isLinux) platformName = 'Linux';

  let isBrowserCompatible = false;
  if (isInApp) {
    isBrowserCompatible = false;
  } else if (isFirefox && isDesktop) {
    isBrowserCompatible = false;
  } else if (isIOS && isSafari) {
    isBrowserCompatible = true;
  } else if (isChrome || isEdge || isOpera) {
    isBrowserCompatible = true;
  } else if (isMac && isSafari) {
    isBrowserCompatible = true;
  } else if (isAndroid) {
    isBrowserCompatible = true;
  }

  cachedClientInfo = {
    isIOS,
    isDesktop,
    isMac,
    isWindows,
    isAndroid,
    browser,
    platformName,
    isBrowserCompatible,
  };

  return cachedClientInfo;
}

export function usePWAInstall() {
  const isInstalled = useSyncExternalStore(
    subscribeMatchMedia,
    () => {
      if (typeof window === 'undefined') return false;
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const localFlag = localStorage.getItem('planit_pwa_installed') === 'true';
      return standaloneMedia || navigatorStandalone || localFlag;
    },
    () => false
  );

  const deferredPrompt = useSyncExternalStore(
    subscribePrompt,
    () => globalDeferredPrompt,
    () => null
  );

  const clientInfo = getClientInfo();

  const install = useCallback(async () => {
    if (!globalDeferredPrompt) return false;
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        try {
          localStorage.setItem('planit_pwa_installed', 'true');
        } catch {
          // ignore
        }
        notifyPromptListeners();
        return true;
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
    return false;
  }, []);

  const isCompatible = !isInstalled && (!!deferredPrompt || clientInfo.isBrowserCompatible);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS: clientInfo.isIOS,
    isDesktop: clientInfo.isDesktop,
    isMac: clientInfo.isMac,
    isWindows: clientInfo.isWindows,
    isAndroid: clientInfo.isAndroid,
    isCompatible,
    browser: clientInfo.browser,
    platformName: clientInfo.platformName,
    install,
  };
}
