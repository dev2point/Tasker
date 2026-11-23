import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { generateChecksum, dataUrlToUint8Array } from '@/lib/file-version-service';
import {
  resolveDepartmentSupervisor,
  stripDossierFileBytesForBroadcast,
  mergeDossierPreservingCachedFileBytes,
} from '@/lib/review-service';
import { setRuntimeDossiers, getRuntimeDossiers } from '@/lib/review-runtime-store';
import { POST as postDossier } from '@/app/api/review/dossiers/route';
import { GET as downloadFileVersion } from '@/app/api/review/file-versions/[versionId]/download/route';
import { POST as generatePdfReport } from '@/app/api/reports/pdf/route';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { realtimeHub, RealtimeEvent } from '@/lib/realtime-hub';
import { ReviewDossier } from '@/types/review';
import { User } from '@/types/user';

vi.mock('@/lib/auth-server', () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    id: 'usr-maker-1',
    name: 'Sarah Benali',
    email: 's.benali@cabinet.fr',
    role: 'member',
    department: 'Fiscalité',
  })),
}));

describe('Résolution des dettes techniques — Intégrité, Sécurité & Workflow', () => {
  beforeEach(() => {
    setRuntimeDossiers([]);
    realtimeHub.reset();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'usr-maker-1',
      name: 'Sarah Benali',
      email: 's.benali@cabinet.fr',
      role: 'member',
      department: 'Fiscalité',
    } as any);
  });

  it('DT-ARCH-17 : generateChecksum calcule un véritable SHA-256 conforme à node:crypto', () => {
    const sample = 'Note de synthèse fiscale IS 2026 — Résultat fiscal 125 000 €';
    const actual = generateChecksum(sample);
    const expected = `sha256:${createHash('sha256').update(Buffer.from(sample, 'utf8')).digest('hex')}`;

    expect(actual).toBe(expected);
    expect(actual).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('DT-ARCH-17 : dataUrlToUint8Array décode correctement une data URL base64', () => {
    const rawText = '%PDF-1.4 sample content';
    const b64 = Buffer.from(rawText, 'utf8').toString('base64');
    const bytes = dataUrlToUint8Array(`data:application/pdf;base64,${b64}`);

    expect(bytes).not.toBeNull();
    expect(Buffer.from(bytes!).toString('utf8')).toBe(rawText);
  });

  it('DT-ARCH-10 : resolveDepartmentSupervisor attribue prioritairement le manager actif du département', () => {
    const team: User[] = [
      {
        id: 'usr-maker-1',
        name: 'Sarah Benali',
        email: 's.benali@cabinet.fr',
        role: 'manager',
        department: 'Fiscalité',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'usr-mgr-fis',
        name: 'Julien Morel',
        email: 'j.morel@cabinet.fr',
        role: 'manager',
        department: 'Fiscalité',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'usr-admin',
        name: 'Claire Delacroix',
        email: 'c.delacroix@cabinet.fr',
        role: 'admin',
        department: 'Direction',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const resolved = resolveDepartmentSupervisor(team, 'Fiscalité', 'usr-maker-1');
    expect(resolved).toBeDefined();
    expect(resolved?.id).toBe('usr-mgr-fis');
    expect(resolved?.role).toBe('manager');

    // Si aucun manager dans le département cible, repli sur un manager actif, sinon admin actif (hors créateur)
    const fallbackManager = resolveDepartmentSupervisor(team, 'Juridique', 'usr-maker-1');
    expect(fallbackManager?.id).toBe('usr-mgr-fis');

    const adminOnlyTeam = team.filter((u) => u.id !== 'usr-mgr-fis');
    const fallbackAdmin = resolveDepartmentSupervisor(adminOnlyTeam, 'Juridique', 'usr-maker-1');
    expect(fallbackAdmin?.id).toBe('usr-admin');
  });

  it('DT-ARCH-05 / 16 / 17 / 18 : POST /api/review/dossiers préserve les fichiers, calcule le SHA-256 serveur, horodate l IP réelle et purge le base64 du SSE', async () => {
    const events: RealtimeEvent[] = [];
    const unsub = realtimeHub.subscribe('test-sub-dossier', (e) => events.push(e));

    const payloadBytes = Buffer.from('Liasse fiscale 2065 PDF binaire', 'utf8');
    const dataUrl = `data:application/pdf;base64,${payloadBytes.toString('base64')}`;
    const expectedServerSha = `sha256:${createHash('sha256').update(payloadBytes).digest('hex')}`;

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.45, 10.0.0.1',
      },
      body: JSON.stringify({
        id: 'dossier-attach-01',
        ref: 'DOS-2026-FIS-777',
        title: 'Liasse 2065 Exercice 2025',
        clientName: 'Alpha Conseils SAS',
        department: 'Fiscalité',
        typology: 'Liasse Fiscale',
        priority: 'high',
        status: 'brouillon',
        trackedFiles: [
          {
            id: 'tf-01',
            fileName: 'liasse-2065.pdf',
            extension: 'pdf',
            currentVersionNumber: 1,
            createdAt: '2026-11-20T09:00:00.000Z',
            updatedAt: '2026-11-20T09:00:00.000Z',
            versions: [
              {
                id: 'ver-01',
                fileId: 'tf-01',
                versionNumber: 1,
                fileName: 'liasse-2065.pdf',
                fileSize: payloadBytes.byteLength,
                uploadedAt: '2026-11-20T09:00:00.000Z',
                uploadedBy: { id: 'usr-maker-1', name: 'Sarah Benali', role: 'collaborateur' },
                textContent: 'Extrait PDF serveur',
                contentUrl: dataUrl,
                checksum: 'client-placeholder',
              },
            ],
          },
        ],
        auditTrail: [
          {
            id: 'aud-init',
            timestamp: '2026-11-20T09:00:00.000Z',
            actorId: 'usr-maker-1',
            actorName: 'Sarah Benali',
            actorDepartment: 'Fiscalité',
            actorRole: 'collaborateur',
            ipAddress: 'server-pending',
            action: 'creation',
            details: 'Création avec pièce jointe',
          },
        ],
      }),
    });

    const res = await postDossier(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // DT-ARCH-16 : trackedFiles conservés
    expect(data.dossier.trackedFiles).toHaveLength(1);
    // DT-ARCH-17 : checksum remplacé par le SHA-256 calculé côté serveur sur les octets
    expect(data.dossier.trackedFiles[0].versions[0].checksum).toBe(expectedServerSha);
    // DT-ARCH-05 : IP factice/pending remplacée par x-forwarded-for réel
    expect(data.dossier.auditTrail[0].ipAddress).toBe('203.0.113.45');

    // DT-ARCH-18 : le broadcast SSE ne contient pas les octets base64 bruts
    expect(events).toHaveLength(1);
    const sseDossier = events[0].payload?.dossier as ReviewDossier;
    expect(sseDossier.trackedFiles?.[0].versions[0].contentUrl).toBe(
      '/api/review/file-versions/ver-01/download?dossierId=dossier-attach-01'
    );

    // DT-ARCH-18 : mergeDossierPreservingCachedFileBytes restaure localement le dataUrl si déjà en cache
    const merged = mergeDossierPreservingCachedFileBytes(sseDossier, data.dossier);
    expect(merged.trackedFiles?.[0].versions[0].contentUrl).toBe(dataUrl);

    unsub();
  });

  it('DT-ARCH-18 : GET /api/review/file-versions/[versionId]/download vérifie auth + RBAC et sert le binaire', async () => {
    const raw = Buffer.from('Contenu binaire confidentiel', 'utf8');
    const dataUrl = `data:application/pdf;base64,${raw.toString('base64')}`;

    setRuntimeDossiers([
      {
        id: 'dos-dl-1',
        ref: 'DOS-2026-FIS-888',
        title: 'Test Download',
        clientName: 'Client A',
        department: 'Fiscalité',
        typology: 'TVA',
        priority: 'medium',
        status: 'soumis',
        version: 1,
        maker: {
          id: 'usr-maker-1',
          name: 'Sarah Benali',
          email: 's.benali@cabinet.fr',
          department: 'Fiscalité',
          role: 'collaborateur',
        },
        lock: { isLocked: false },
        estimatedDeliverableDate: '2026-12-01',
        dataFields: [],
        textDocument: {
          documentId: 'doc-1',
          title: 'Note',
          type: 'note_synthese',
          previousContent: '',
          currentContent: '',
        },
        trackedFiles: [
          {
            id: 'tf-dl-1',
            name: 'attestation.pdf',
            originalName: 'attestation.pdf',
            fileType: 'pdf',
            currentVersion: 'v1.0',
            createdAt: '2026-11-20T09:00:00.000Z',
            updatedAt: '2026-11-20T09:00:00.000Z',
            versions: [
              {
                id: 'ver-dl-1',
                versionNumber: 'v1.0',
                fileName: 'attestation.pdf',
                fileType: 'pdf',
                sizeBytes: raw.byteLength,
                createdAt: '2026-11-20T09:00:00.000Z',
                authorName: 'Sarah Benali',
                summary: 'Initial',
                isCurrent: true,
                textContent: 'Attestation',
                contentUrl: dataUrl,
                checksum: 'sha256:test',
              },
            ],
          },
        ],
        interDepRequests: [],
        auditTrail: [],
        createdAt: '2026-11-20T09:00:00.000Z',
        updatedAt: '2026-11-20T09:00:00.000Z',
      },
    ]);

    // 1. Utilisateur autorisé (maker / même département) -> 200 OK
    const okRes = await downloadFileVersion(
      new NextRequest('http://localhost:3000/api/review/file-versions/ver-dl-1/download?dossierId=dos-dl-1'),
      { params: Promise.resolve({ versionId: 'ver-dl-1' }) }
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await okRes.arrayBuffer()).toString('utf8')).toBe('Contenu binaire confidentiel');

    // 2. Utilisateur d'un autre département sans rôle admin/manager -> 403 Forbidden
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({
      id: 'usr-other',
      name: 'Autre Collab',
      email: 'autre@cabinet.fr',
      role: 'member',
      department: 'Juridique',
    } as any);
    const forbidRes = await downloadFileVersion(
      new NextRequest('http://localhost:3000/api/review/file-versions/ver-dl-1/download?dossierId=dos-dl-1'),
      { params: Promise.resolve({ versionId: 'ver-dl-1' }) }
    );
    expect(forbidRes.status).toBe(403);

    // 3. Sans session -> 401
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
    const unauthRes = await downloadFileVersion(
      new NextRequest('http://localhost:3000/api/review/file-versions/ver-dl-1/download?dossierId=dos-dl-1'),
      { params: Promise.resolve({ versionId: 'ver-dl-1' }) }
    );
    expect(unauthRes.status).toBe(401);
  });

  it('DT-ARCH-11 : POST /api/reports/pdf génère un PDF serveur valide avec pdf-lib', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          customTitle: 'Bilan Exécutif Nov 2026',
          authorName: 'Sarah Benali',
          selectedDepartment: 'Fiscalité',
          periodLabel: 'Novembre 2026',
        },
        metrics: {
          periodLabel: 'Novembre 2026',
          totalTasks: 12,
          completedTasks: 9,
          overdueTasks: 1,
          taskCompletionRate: 75,
          totalDossiers: 4,
          validatedDossiers: 3,
          firstPassYieldRate: 75,
          blockedDossiers: 0,
          pendingRequestsCount: 1,
          departmentStats: [
            {
              department: 'Fiscalité',
              totalDossiers: 4,
              validatedCount: 3,
              amendmentCount: 1,
              pendingReviewCount: 0,
              completionRate: 75,
            },
          ],
          recentDecisions: [],
          blockedItemsList: [],
          executiveRecommendations: ['Maintenir la revue N+1 sous 48h.'],
        },
      }),
    });

    const res = await generatePdfReport(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('DT-ARCH-18 : stripDossierFileBytesForBroadcast nettoie les data URLs tout en conservant les métadonnées', () => {
    const sample = getRuntimeDossiers();
    expect(Array.isArray(sample)).toBe(true);

    const stripped = stripDossierFileBytesForBroadcast({
      id: 'dos-1',
      ref: 'DOS-1',
      title: 'T',
      clientName: 'C',
      department: 'Fiscalité',
      typology: 'IS',
      priority: 'low',
      status: 'brouillon',
      version: 1,
      maker: {
        id: 'u1',
        name: 'M',
        email: 'm@cabinet.fr',
        department: 'Fiscalité',
        role: 'collaborateur',
      },
      lock: { isLocked: false },
      estimatedDeliverableDate: '2026-12-01',
      dataFields: [],
      textDocument: {
        documentId: 'd1',
        title: 't',
        type: 'note_synthese',
        previousContent: '',
        currentContent: '',
      },
      trackedFiles: [
        {
          id: 'f1',
          name: 'memo.docx',
          originalName: 'memo.docx',
          fileType: 'docx',
          currentVersion: 'v1.0',
          createdAt: '',
          updatedAt: '',
          versions: [
            {
              id: 'v1',
              versionNumber: 'v1.0',
              fileName: 'memo.docx',
              fileType: 'docx',
              sizeBytes: 120,
              createdAt: '',
              authorName: 'M',
              summary: 'Initial',
              isCurrent: true,
              textContent: 'Mémo fiscal',
              contentUrl: 'data:application/octet-stream;base64,AAAA',
              checksum: 'sha256:abc',
            },
          ],
        },
      ],
      interDepRequests: [],
      auditTrail: [],
      createdAt: '',
      updatedAt: '',
    });

    expect(stripped.trackedFiles?.[0].versions[0].contentUrl).toBe(
      '/api/review/file-versions/v1/download?dossierId=dos-1'
    );
    expect(stripped.trackedFiles?.[0].versions[0].textContent).toBe('Mémo fiscal');
  });
});
