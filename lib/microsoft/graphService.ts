'use client';

import { Client } from '@microsoft/microsoft-graph-client';
import { Task } from '@/types/task';

export interface GraphUserProfile {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
}

export interface OutlookEventPayload {
  subject: string;
  body: {
    contentType: 'Text' | 'HTML';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  importance?: 'low' | 'normal' | 'high';
  categories?: string[];
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

/**
 * Initializes a Microsoft Graph Client with a bearer token
 */
export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Retrieves the signed-in Microsoft 365 user profile
 */
export async function fetchM365Profile(accessToken: string): Promise<GraphUserProfile> {
  const client = getGraphClient(accessToken);
  const profile = await client.api('/me').select('id,displayName,mail,userPrincipalName,jobTitle,officeLocation').get();
  return profile as GraphUserProfile;
}

/**
 * Creates an event or deadline in the user's Outlook Calendar
 */
export async function createOutlookCalendarEvent(
  accessToken: string,
  event: OutlookEventPayload
): Promise<{ id: string; webLink?: string }> {
  const client = getGraphClient(accessToken);
  const created = await client.api('/me/events').post(event);
  return {
    id: created.id,
    webLink: created.webLink,
  };
}

/**
 * Syncs multiple tasks as calendar events in Outlook
 */
export async function syncTasksToOutlookCalendar(
  accessToken: string,
  tasks: Task[]
): Promise<{ syncedCount: number; errors: number }> {
  const client = getGraphClient(accessToken);
  let syncedCount = 0;
  let errors = 0;

  // Sync only tasks that have a dueDate
  const tasksWithDueDates = tasks.filter((t) => t.dueDate);

  for (const task of tasksWithDueDates) {
    try {
      const dueDate = new Date(task.dueDate!);
      const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before or at date

      const priorityMap: Record<string, 'low' | 'normal' | 'high'> = {
        low: 'low',
        medium: 'normal',
        high: 'high',
        urgent: 'high',
      };

      const payload: OutlookEventPayload = {
        subject: `[Cabinet] ${task.title}`,
        body: {
          contentType: 'HTML',
          content: `
            <div style="font-family: Arial, sans-serif; color: #1e293b;">
              <h2 style="color: #059669;">Dossier / Tâche : ${task.title}</h2>
              <p><strong>Priorité :</strong> ${task.priority.toUpperCase()}</p>
              <p><strong>Statut :</strong> ${task.completed ? 'Clôturée' : 'En cours'}</p>
              ${task.description ? `<p><strong>Description :</strong><br/>${task.description}</p>` : ''}
              ${task.tags && task.tags.length > 0 ? `<p><strong>Tags :</strong> ${task.tags.join(', ')}</p>` : ''}
              <hr style="border: 1px solid #e2e8f0; margin: 15px 0;" />
              <p style="font-size: 11px; color: #64748b;">Synchronisé depuis l'application de gestion de cabinet juridique & fiscal.</p>
            </div>
          `,
        },
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
        },
        end: {
          dateTime: dueDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
        },
        importance: priorityMap[task.priority] || 'normal',
        categories: [task.category || 'Cabinet', 'Échéance'],
        isReminderOn: true,
        reminderMinutesBeforeStart: 120, // 2 hours
      };

      await client.api('/me/events').post(payload);
      syncedCount++;
    } catch {
      errors++;
    }
  }

  return { syncedCount, errors };
}

/**
 * Uploads a document directly to the user's OneDrive in a designated folder
 */
export async function uploadDocumentToOneDrive(
  accessToken: string,
  params: {
    fileName: string;
    content: Blob | ArrayBuffer | string;
    folderName?: string;
  }
): Promise<{ id: string; name: string; webUrl: string }> {
  const client = getGraphClient(accessToken);
  const folder = params.folderName || 'Cabinet_Documents';

  // Check if folder exists or create it under root
  try {
    await client.api('/me/drive/root/children').post({
      name: folder,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'replace',
    });
  } catch {
    // folder might already exist
  }

  const endpoint = `/me/drive/root:/${folder}/${encodeURIComponent(params.fileName)}:/content`;
  const result = await client.api(endpoint).put(params.content);

  return {
    id: result.id,
    name: result.name,
    webUrl: result.webUrl,
  };
}
