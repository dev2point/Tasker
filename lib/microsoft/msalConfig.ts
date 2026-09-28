'use client';

import { Configuration, PublicClientApplication, LogLevel } from '@azure/msal-browser';

// Microsoft Graph Scopes needed for Cabinet integration
export const GRAPH_SCOPES = [
  'User.Read',
  'Calendars.ReadWrite',
  'Files.ReadWrite',
  'Tasks.ReadWrite',
];

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '';
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common';

export const isMsalConfigured = Boolean(clientId && clientId.trim().length > 0);

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || '00000000-0000-0000-0000-000000000000', // Fallback placeholder if not set
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (process.env.NODE_ENV === 'development' && level <= LogLevel.Warning) {
          console.log('[MSAL]', message);
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

let msalInstance: PublicClientApplication | null = null;
let isInitializing: Promise<PublicClientApplication> | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance;
  }

  if (isInitializing) {
    return isInitializing;
  }

  isInitializing = (async () => {
    const instance = new PublicClientApplication(msalConfig);
    await instance.initialize();
    msalInstance = instance;
    return instance;
  })();

  return isInitializing;
}
