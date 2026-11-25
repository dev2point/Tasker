'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';

export type PWAInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface RelatedApplication {
  platform?: string;
  url?: string;
  id?: string;
  version?: string;
}

interface NavigatorWithRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
}

interface WindowWithDeferredPrompt extends Window {
  __planitDeferredPrompt?: BeforeInstallPromptEvent | null;
  __planitAppInstalled?: boolean;
}

const INSTALLED_STORAGE_KEY = 'planit_pwa_installed';

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalRelatedAppInstalled = false;
const promptListeners = new Set<() => void>();
const installedListeners = new Set<() => void>();

function notifyPromptListeners() {
  promptListeners.forEach((l) => l());
}

function notifyInstalledListeners() {
  installedListeners.forEach((l) => l());
}

function persistInstalledFlag(installed: boolean) {
  if (typeof window === 'undefined') return;
  (window as WindowWithDeferredPrompt).__planitAppInstalled = installed;
  try {
    if (installed) {
      localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(INSTALLED_STORAGE_KEY);
    }
  } catch {
    // ignore storage access errors
  }
}

function markAppInstalled() {
  globalDeferredPrompt = null;
  if (typeof window !== 'undefined') {
    (window as WindowWithDeferredPrompt).__planitDeferredPrompt = null;
  }
  persistInstalledFlag(true);
  notifyPromptListeners();
  notifyInstalledListeners();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const promptEvent = e as BeforeInstallPromptEvent;
    globalDeferredPrompt = promptEvent;
    (window as WindowWithDeferredPrompt).__planitDeferredPrompt = promptEvent;
    globalRelatedAppInstalled = false;
    persistInstalledFlag(false);
    notifyInstalledListeners();
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    markAppInstalled();
  });
}

function getActiveDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window !== 'undefined' && '__planitDeferredPrompt' in window) {
    return (window as WindowWithDeferredPrompt).__planitDeferredPrompt ?? null;
  }
  return globalDeferredPrompt;
}

function subscribePrompt(cb: () => void) {
  promptListeners.add(cb);
  return () => {
    promptListeners.delete(cb);
  };
}

function subscribeInstalled(cb: () => void) {
  installedListeners.add(cb);
  if (typeof window === 'undefined') {
    return () => {
      installedListeners.delete(cb);
    };
  }
  const mediaStandalone = window.matchMedia('(display-mode: standalone)');
  const mediaFullscreen = window.matchMedia('(display-mode: fullscreen)');
  const mediaMinimal = window.matchMedia('(display-mode: minimal-ui)');
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === INSTALLED_STORAGE_KEY) {
      cb();
    }
  };
  mediaStandalone.addEventListener('change', cb);
  mediaFullscreen.addEventListener('change', cb);
  mediaMinimal.addEventListener('change', cb);
  window.addEventListener('storage', handleStorage);
  return () => {
    installedListeners.delete(cb);
    mediaStandalone.removeEventListener('change', cb);
    mediaFullscreen.removeEventListener('change', cb);
    mediaMinimal.removeEventListener('change', cb);
    window.removeEventListener('storage', handleStorage);
  };
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

const subscribeNoop = () => () => {};
const getServerClientInfo = () => defaultClientInfo;

function getIsInstalledSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const navigatorStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (standaloneMedia || navigatorStandalone) {
    return true;
  }

  if (globalRelatedAppInstalled) {
    return true;
  }

  if ((window as WindowWithDeferredPrompt).__planitAppInstalled) {
    return true;
  }

  try {
    if (localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function usePWAInstall() {
  const isInstalled = useSyncExternalStore(
    subscribeInstalled,
    getIsInstalledSnapshot,
    () => false
  );

  const deferredPrompt = useSyncExternalStore(
    subscribePrompt,
    () => getActiveDeferredPrompt(),
    () => null
  );

  const clientInfo = useSyncExternalStore(
    subscribeNoop,
    getClientInfo,
    getServerClientInfo
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const nav = window.navigator as NavigatorWithRelatedApps;

    if (typeof nav.getInstalledRelatedApps === 'function') {
      nav
        .getInstalledRelatedApps()
        .then((relatedApps) => {
          if (cancelled) return;
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            globalRelatedAppInstalled = true;
            markAppInstalled();
          } else {
            globalRelatedAppInstalled = false;
          }
        })
        .catch(() => {
          // Ignore unsupported environments (e.g. cross-origin iframes)
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PWAInstallOutcome> => {
    const promptEvent = getActiveDeferredPrompt();
    if (!promptEvent) return 'unavailable';
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      globalDeferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as WindowWithDeferredPrompt).__planitDeferredPrompt = null;
      }
      if (outcome === 'accepted') {
        persistInstalledFlag(true);
        notifyInstalledListeners();
      }
      notifyPromptListeners();
      return outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      globalDeferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as WindowWithDeferredPrompt).__planitDeferredPrompt = null;
      }
      notifyPromptListeners();
      return 'unavailable';
    }
  }, []);

  const install = useCallback(async () => {
    const outcome = await promptInstall();
    return outcome === 'accepted';
  }, [promptInstall]);

  // On desktop/Android, only show install button when the browser actually fires beforeinstallprompt
  // (meaning the app is genuinely installable and not already installed). On iOS Safari, where
  // beforeinstallprompt does not exist, show when Safari is compatible and not already standalone.
  const isCompatible =
    !isInstalled && (clientInfo.isIOS ? clientInfo.isBrowserCompatible : !!deferredPrompt);

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
    promptInstall,
  };
}
