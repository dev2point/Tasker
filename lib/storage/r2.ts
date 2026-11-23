import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const globalForR2 = globalThis as typeof globalThis & {
  __r2S3Client?: S3Client | null;
};

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function getR2Config() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME) || 'mfisca-task-private';
  const explicitEndpoint = cleanEnv(process.env.R2_ENDPOINT);
  const endpoint =
    explicitEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
  };
}

export function getR2MissingConfigKeys(): string[] {
  const cfg = getR2Config();
  const missing: string[] = [];

  if (!cfg.endpoint) missing.push('R2_ENDPOINT');
  if (!cfg.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!cfg.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!cfg.bucketName) missing.push('R2_BUCKET_NAME');

  return missing;
}

export function isR2Configured(): boolean {
  return getR2MissingConfigKeys().length === 0;
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  if (!globalForR2.__r2S3Client) {
    const cfg = getR2Config();
    globalForR2.__r2S3Client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  return globalForR2.__r2S3Client;
}

export function buildR2ObjectKey(params: {
  dossierId?: string;
  fileId?: string;
  versionId: string;
  fileName: string;
}): string {
  const safeDossier = (params.dossierId || 'unassigned').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFile = (params.fileId || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeVersion = params.versionId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = params.fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);

  return `dossiers/${safeDossier}/${safeFile}/${safeVersion}/${safeName || 'document.bin'}`;
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
  checksumSha256?: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; bucket: string; etag?: string }> {
  const client = getR2Client();
  const cfg = getR2Config();
  if (!client) {
    throw new Error('Cloudflare R2 n est pas configuré.');
  }

  const command = new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType || 'application/octet-stream',
    Metadata: {
      ...(params.metadata || {}),
      ...(params.checksumSha256 ? { sha256: params.checksumSha256 } : {}),
    },
  });

  const result = await client.send(command);
  return {
    key: params.key,
    bucket: cfg.bucketName,
    etag: result.ETag,
  };
}

export async function getSignedDownloadUrlFromR2(
  key: string,
  expiresInSeconds = 300,
  fileName?: string
): Promise<string> {
  const client = getR2Client();
  const cfg = getR2Config();
  if (!client) {
    throw new Error('Cloudflare R2 n est pas configuré.');
  }

  const safeName = fileName ? fileName.replace(/["\r\n]/g, '_') : undefined;
  const command = new GetObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
    ...(safeName
      ? { ResponseContentDisposition: `attachment; filename="${safeName}"` }
      : {}),
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function getObjectBytesFromR2(key: string): Promise<{
  bytes: Uint8Array;
  contentType?: string;
} | null> {
  const client = getR2Client();
  const cfg = getR2Config();
  if (!client) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucketName,
        Key: key,
      })
    );
    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return {
      bytes,
      contentType: response.ContentType,
    };
  } catch (err) {
    console.warn('[R2] Failed to fetch object from R2:', key, err);
    return null;
  }
}

export async function deleteObjectFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const cfg = getR2Config();
  if (!client || !key) return false;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.warn('[R2] Failed to delete object from R2:', key, err);
    return false;
  }
}
