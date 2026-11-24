import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from '@/lib/web-push/client';

describe('urlBase64ToUint8Array', () => {
  it('turns url-safe base64 into bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
  });
});
