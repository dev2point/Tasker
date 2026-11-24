import type { Root } from 'react-dom/client';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

type HappyDOMWindow = Window & {
  happyDOM?: { setURL(url: string): void };
};

describe('ServiceWorkerRegister', () => {
  const register = vi.fn(async () => {});
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    const happyWindow = window as HappyDOMWindow;
    happyWindow.happyDOM?.setURL('http://localhost:3000/');
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    register.mockReset();
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = null;
    }
    container.remove();
    Reflect.deleteProperty(document, 'readyState');
    Reflect.deleteProperty(window.navigator, 'serviceWorker');
  });

  it('registers /sw.js immediately when the page is already loaded', async () => {
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(ServiceWorkerRegister));
    });

    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});
