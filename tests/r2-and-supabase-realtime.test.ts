import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { setRuntimeDossiers } from '@/lib/review-runtime-store';
import * as r2Storage from '@/lib/storage/r2';
import { POST as uploadReviewFile } from '@/app/api/review/files/upload/route';
import { GET as downloadFileVersion } from '@/app/api/review/file-versions/[versionId]/download/route';
import { publishToSupabaseRealtime } from '@/lib/supabase/realtime-publisher';
import {
  SUPABASE_BROADCAST_EVENT,
  SUPABASE_REALTIME_CHANNEL,
  getSupabaseKeyFormat,
  isSupabaseClientConfigured,
  isSupabaseServerConfigured,
} from '@/lib/supabase/config';
import { ReviewDossier } from '@/types/review';
import type { RealtimeEvent } from '@/lib/realtime-hub';

vi.mock('@/lib/auth-server', () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    id: 'usr-maker-1',
    name: 'Sarah Benali',
    email: 's.benali@cabinet.fr',
    role: 'member',
    department: 'Fiscalité',
  })),
}));

const ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENABLE_SUPABASE_REALTIME_IN_TESTS',
] as const;

const savedEnv: Record<string, string | undefined> = {};

describe('Cloudflare R2 & Supabase Realtime Integration', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    setRuntimeDossiers([]);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'usr-maker-1',
      name: 'Sarah Benali',
      email: 's.benali@cabinet.fr',
      role: 'member',
      department: 'Fiscalité',
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('R2 : buildR2ObjectKey normalise les chemins et accents', () => {
    const key = r2Storage.buildR2ObjectKey({
      dossierId: 'dos-2026/01',
      fileId: 'file-abc',
      versionId: 'ver-1',
      fileName: 'Liasse Fiscale État 2026.pdf',
    });

    expect(key).toBe('dossiers/dos-2026_01/file-abc/ver-1/Liasse_Fiscale_Etat_2026.pdf');
  });

  it('R2 : isR2Configured détecte correctement la présence des clés', () => {
    expect(r2Storage.isR2Configured()).toBe(false);

    process.env.R2_ACCOUNT_ID = 'acc123';
    process.env.R2_ACCESS_KEY_ID = 'key123';
    process.env.R2_SECRET_ACCESS_KEY = 'secret123';
    process.env.R2_BUCKET_NAME = 'mfisca-bucket';

    expect(r2Storage.isR2Configured()).toBe(true);
    expect(r2Storage.getR2Config().endpoint).toBe('https://acc123.r2.cloudflarestorage.com');
  });

  it('R2 Upload Route : rejette les requêtes non authentifiées (401)', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'note.txt', { type: 'text/plain' }));
    const req = new NextRequest('http://localhost/api/review/files/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadReviewFile(req);
    expect(res.status).toBe(401);
  });

  it('R2 Upload Route : bascule en mode inline avec SHA-256 serveur si R2 est absent', async () => {
    const content = 'Note fiscale sans R2';
    const expectedHash = `sha256:${createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex')}`;

    const formData = new FormData();
    formData.append('file', new File([content], 'note.txt', { type: 'text/plain' }));
    formData.append('dossierId', 'dos-local-1');
    formData.append('fileId', 'file-local-1');
    formData.append('versionId', 'ver-local-1');

    const req = new NextRequest('http://localhost/api/review/files/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadReviewFile(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storageProvider).toBe('inline');
    expect(data.r2Key).toBeNull();
    expect(data.checksum).toBe(expectedHash);
    expect(data.downloadUrl).toContain('/api/review/file-versions/ver-local-1/download');
  });

  it('R2 Upload Route : téléverse vers R2 lorsque les variables R2 sont configurées', async () => {
    process.env.R2_ACCOUNT_ID = 'acc123';
    process.env.R2_ACCESS_KEY_ID = 'key123';
    process.env.R2_SECRET_ACCESS_KEY = 'secret123';
    process.env.R2_BUCKET_NAME = 'mfisca-bucket';

    const uploadSpy = vi.spyOn(r2Storage, 'uploadBufferToR2').mockResolvedValueOnce({
      key: 'dossiers/dos-r2-1/file-1/ver-1/rapport.pdf',
      bucket: 'mfisca-bucket',
      etag: '"etag-1"',
    });

    const formData = new FormData();
    formData.append('file', new File(['%PDF-1.4 content'], 'rapport.pdf', { type: 'application/pdf' }));
    formData.append('dossierId', 'dos-r2-1');
    formData.append('fileId', 'file-1');
    formData.append('versionId', 'ver-1');

    const req = new NextRequest('http://localhost/api/review/files/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadReviewFile(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(data.storageProvider).toBe('r2');
    expect(data.r2Key).toBe('dossiers/dos-r2-1/file-1/ver-1/rapport.pdf');
    expect(data.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('R2 Download Route : diffuse les octets depuis R2 et génère des URLs signées', async () => {
    process.env.R2_ACCOUNT_ID = 'acc123';
    process.env.R2_ACCESS_KEY_ID = 'key123';
    process.env.R2_SECRET_ACCESS_KEY = 'secret123';
    process.env.R2_BUCKET_NAME = 'mfisca-bucket';

    const dossier: ReviewDossier = {
      id: 'dos-r2-dl',
      ref: 'DOS-2026-FIS-999',
      title: 'Liasse R2',
      clientName: 'SAS Beta',
      department: 'Fiscalité',
      typology: 'Liasse Fiscale & CVAE',
      priority: 'high',
      status: 'en_revision',
      version: 1,
      maker: {
        id: 'usr-maker-1',
        name: 'Sarah Benali',
        email: 's.benali@cabinet.fr',
        role: 'collaborateur',
        department: 'Fiscalité',
      },
      lock: { isLocked: false },
      estimatedDeliverableDate: '2026-12-01',
      createdAt: '2026-11-20T08:00:00.000Z',
      updatedAt: '2026-11-20T08:00:00.000Z',
      dataFields: [],
      textDocument: {
        documentId: 'doc-1',
        title: 'Synthèse',
        type: 'conclusions_fiscales',
        previousContent: 'a',
        currentContent: 'b',
        lastAmendedBy: 'Sarah',
        lastAmendedAt: '2026-11-20T08:00:00.000Z',
        amendmentNotes: 'init',
      },
      trackedFiles: [
        {
          id: 'file-r2-1',
          name: 'declaration.pdf',
          originalName: 'declaration.pdf',
          fileType: 'pdf',
          createdAt: '2026-11-20T08:00:00.000Z',
          updatedAt: '2026-11-20T08:00:00.000Z',
          currentVersion: 'v1.0',
          versions: [
            {
              id: 'ver-r2-1',
              versionNumber: 'v1.0',
              createdAt: '2026-11-20T08:00:00.000Z',
              authorName: 'Sarah Benali',
              summary: 'v1',
              sizeBytes: 12,
              fileName: 'declaration.pdf',
              fileType: 'pdf',
              storageProvider: 'r2',
              r2Key: 'dossiers/dos-r2-dl/file-r2-1/ver-r2-1/declaration.pdf',
              isCurrent: true,
            },
          ],
        },
      ],
      interDepRequests: [],
      auditTrail: [],
    };
    setRuntimeDossiers([dossier]);

    vi.spyOn(r2Storage, 'getSignedDownloadUrlFromR2').mockResolvedValueOnce(
      'https://acc123.r2.cloudflarestorage.com/mfisca-bucket/signed-url'
    );

    const signedReq = new NextRequest(
      'http://localhost/api/review/file-versions/ver-r2-1/download?dossierId=dos-r2-dl&mode=signed'
    );
    const signedRes = await downloadFileVersion(signedReq, {
      params: Promise.resolve({ versionId: 'ver-r2-1' }),
    });
    expect(signedRes.status).toBe(200);
    const signedJson = await signedRes.json();
    expect(signedJson.storageProvider).toBe('r2');
    expect(signedJson.signedUrl).toContain('r2.cloudflarestorage.com');

    vi.spyOn(r2Storage, 'getObjectBytesFromR2').mockResolvedValueOnce({
      bytes: new TextEncoder().encode('%PDF-R2-BYTES'),
      contentType: 'application/pdf',
    });

    const streamReq = new NextRequest(
      'http://localhost/api/review/file-versions/ver-r2-1/download?dossierId=dos-r2-dl'
    );
    const streamRes = await downloadFileVersion(streamReq, {
      params: Promise.resolve({ versionId: 'ver-r2-1' }),
    });
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('X-Storage-Provider')).toBe('cloudflare-r2');
    expect(await streamRes.text()).toBe('%PDF-R2-BYTES');
  });

  it('Supabase Realtime : utilise les nouvelles clés publishable & secret sans en-tête Bearer', async () => {
    expect(isSupabaseClientConfigured()).toBe(false);
    expect(isSupabaseServerConfigured()).toBe(false);
    expect(getSupabaseKeyFormat()).toBe('unconfigured');

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzcompany.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_demo_key_1234567890';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_demo_server_key_1234567890';
    process.env.ENABLE_SUPABASE_REALTIME_IN_TESTS = '1';

    expect(isSupabaseClientConfigured()).toBe(true);
    expect(isSupabaseServerConfigured()).toBe(true);
    expect(getSupabaseKeyFormat()).toBe('publishable_secret');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 202 }));

    const sampleEvent: RealtimeEvent = {
      id: 'evt-supa-1',
      type: 'DOSSIER_SUBMITTED',
      timestamp: '2026-11-22T08:30:00.000Z',
      actor: { id: 'usr-1', name: 'Sarah' },
      targetId: 'dos-1',
      message: 'Dossier soumis',
    };

    const ok = await publishToSupabaseRealtime(sampleEvent);
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://xyzcompany.supabase.co/realtime/v1/api/broadcast');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_secret_demo_server_key_1234567890');
    expect(headers.Authorization).toBeUndefined();

    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.messages[0]).toEqual({
      topic: SUPABASE_REALTIME_CHANNEL,
      event: SUPABASE_BROADCAST_EVENT,
      payload: sampleEvent,
    });
  });

  it('Supabase Realtime : conserve le repli sur les anciennes clés JWT pendant la transition', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzcompany.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.sig';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig';
    process.env.ENABLE_SUPABASE_REALTIME_IN_TESTS = '1';

    expect(isSupabaseClientConfigured()).toBe(true);
    expect(isSupabaseServerConfigured()).toBe(true);
    expect(getSupabaseKeyFormat()).toBe('legacy_jwt');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 202 }));

    const ok = await publishToSupabaseRealtime({
      id: 'evt-supa-legacy',
      type: 'TASK_UPDATED',
      timestamp: '2026-11-22T08:31:00.000Z',
      actor: { id: 'usr-1', name: 'Sarah' },
      message: 'Tâche mise à jour',
    });

    expect(ok).toBe(true);
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.apikey).toBe(process.env.SUPABASE_SERVICE_ROLE_KEY);
    expect(headers.Authorization).toBe(`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  });
});
