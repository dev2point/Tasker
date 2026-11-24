import { NextResponse } from 'next/server';
import { getWebPushConfig } from '@/lib/web-push/config';

export async function GET() {
  const config = getWebPushConfig();
  if (!config) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, publicKey: config.publicKey });
}
