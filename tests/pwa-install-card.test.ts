import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      void whileHover;
      void whileTap;
      return createElement('div', rest, children);
    },
  },
}));

import { PWAFloatingInstallCard } from '@/components/pwa/PWAFloatingInstallCard';

function makeBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const promptSpy = vi.fn(async () => {});
  const event = new Event('beforeinstallprompt');
  Object.assign(event, {
    prompt: promptSpy,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  return { event, promptSpy };
}

describe('PWAFloatingInstallCard direct install & installed detection', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = navigator.userAgent;
  const originalGetInstalledRelatedApps = (
    navigator as unknown as { getInstalledRelatedApps?: unknown }
  ).getInstalledRelatedApps;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    delete (navigator as unknown as { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps;
    delete (window as unknown as { __planitAppInstalled?: boolean }).__planitAppInstalled;
    delete (window as unknown as { __planitDeferredPrompt?: unknown }).__planitDeferredPrompt;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = null;
    }
    container.remove();
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    if (originalGetInstalledRelatedApps !== undefined) {
      Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
        configurable: true,
        value: originalGetInstalledRelatedApps,
      });
    } else {
      delete (navigator as unknown as { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps;
    }
    delete (window as unknown as { __planitDeferredPrompt?: unknown }).__planitDeferredPrompt;
    delete (window as unknown as { __planitAppInstalled?: boolean }).__planitAppInstalled;
  });

  it('triggers native prompt() directly on clicking "Installer l\'App" and hides button once accepted', async () => {
    const { event, promptSpy } = makeBeforeInstallPrompt('accepted');
    (window as unknown as { __planitDeferredPrompt?: Event }).__planitDeferredPrompt = event;

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });

    const installBtn = container.querySelector('#pwa-reopen-card-btn') as HTMLButtonElement | null;
    expect(installBtn).not.toBeNull();
    expect(installBtn?.textContent).toContain("Installer l'App");
    expect(container.textContent).not.toContain('Plus tard');

    await act(async () => {
      installBtn?.click();
    });

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('planit_pwa_installed')).toBe('true');
    expect(container.querySelector('#pwa-reopen-card-btn')).toBeNull();
  });

  it('does not show on desktop when browser has not fired beforeinstallprompt', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });

    expect(container.querySelector('#pwa-reopen-card-btn')).toBeNull();
  });

  it('persists installed state on appinstalled and keeps button hidden even in normal browser tab', async () => {
    const { event } = makeBeforeInstallPrompt('dismissed');
    (window as unknown as { __planitDeferredPrompt?: Event }).__planitDeferredPrompt = event;

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });
    expect(container.querySelector('#pwa-reopen-card-btn')).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(localStorage.getItem('planit_pwa_installed')).toBe('true');
    expect(container.querySelector('#pwa-reopen-card-btn')).toBeNull();
  });

  it('hides button when navigator.getInstalledRelatedApps detects an installed PWA', async () => {
    const { event } = makeBeforeInstallPrompt('accepted');
    (window as unknown as { __planitDeferredPrompt?: Event }).__planitDeferredPrompt = event;
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn(async () => [{ platform: 'webapp', url: 'https://example.com/manifest.webmanifest' }]),
    });

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('#pwa-reopen-card-btn')).toBeNull();
    expect(localStorage.getItem('planit_pwa_installed')).toBe('true');
  });

  it('restores install button if beforeinstallprompt fires again after uninstallation', async () => {
    localStorage.setItem('planit_pwa_installed', 'true');

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });
    expect(container.querySelector('#pwa-reopen-card-btn')).toBeNull();

    const { event } = makeBeforeInstallPrompt('accepted');
    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(localStorage.getItem('planit_pwa_installed')).toBeNull();
    expect(container.querySelector('#pwa-reopen-card-btn')).not.toBeNull();
  });

  it('does not show manual fallback dialog when user dismisses the native install prompt', async () => {
    const { event, promptSpy } = makeBeforeInstallPrompt('dismissed');
    (window as unknown as { __planitDeferredPrompt?: Event }).__planitDeferredPrompt = event;

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PWAFloatingInstallCard));
    });

    const installBtn = container.querySelector('#pwa-reopen-card-btn') as HTMLButtonElement | null;
    expect(installBtn).not.toBeNull();
    await act(async () => {
      installBtn?.click();
    });

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Installation dans le navigateur');
  });
});
