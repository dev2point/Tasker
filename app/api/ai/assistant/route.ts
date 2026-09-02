import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, taskTitle, taskDescription, existingTasks } = body;

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(
        { error: 'Clé API Gemini non configurée.' },
        { status: 400 }
      );
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // Action 1: Parse natural language task into structured fields
    if (action === 'parse_task') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Tu es un assistant expert en productivité et gestion de tâches.
La date d'aujourd'hui est ${todayDate}.
Analyse la demande suivante de l'utilisateur pour extraire les détails d'une tâche structurée en français.

Demande: "${prompt}"

Extrais et déduis logiquement:
- title (titre clair et concis)
- description (détails supplémentaires si mentionnés)
- dueDate (format YYYY-MM-DD, relatif à aujourd'hui si mentionné "demain", "vendredi", "le 15", etc. Si non spécifié, utilise aujourd'hui ${todayDate})
- dueTime (format HH:mm en 24h, ex "14:30", ou "" si non spécifié)
- priority ("urgent", "high", "medium", ou "low")
- category ("travail", "personnel", "projet", "sante", "finance", "etudes")
- reminderMinutesBefore (nombre de minutes avant: 0, 5, 10, 15, 30, 60, 120, 1440, ou -1 si non souhaité. Si un rappel est suggéré ou implicite, utilise 15 ou 30)
- subtasks (liste de 2 à 4 sous-tâches concrètes et pertinentes)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              dueTime: { type: Type.STRING },
              priority: {
                type: Type.STRING,
                enum: ['urgent', 'high', 'medium', 'low'],
              },
              category: {
                type: Type.STRING,
                enum: ['travail', 'personnel', 'projet', 'sante', 'finance', 'etudes'],
              },
              reminderMinutesBefore: { type: Type.INTEGER },
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'dueDate', 'priority', 'category', 'reminderMinutesBefore'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ result: parsed });
    }

    // Action 2: Breakdown a task into structured checklist subtasks
    if (action === 'breakdown_subtasks') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Découpe cette tâche en 3 à 5 sous-tâches concrètes, actionnables et chronologiques en français.
Titre de la tâche: "${taskTitle}"
Description: "${taskDescription || ''}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
              },
              required: ['title'],
            },
          },
        },
      });

      const subtasks = JSON.parse(response.text || '[]');
      return NextResponse.json({ subtasks });
    }

    // Action 3: Daily Planning & Productivity Advice
    if (action === 'daily_planner_advice') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Tu es un coach de productivité bienveillant et méthodique.
La date d'aujourd'hui est ${todayDate}.
Voici la liste des tâches actuelles de l'utilisateur :
${JSON.stringify(existingTasks, null, 2)}

Fournis une analyse et un plan d'action optimisé en français au format JSON:
1. summary: Un résumé encourageant de 1-2 phrases sur la charge du jour.
2. recommendedOrder: La liste ordonnée des IDs de tâches recommandées à traiter en priorité ce matin / aujourd'hui.
3. tips: 2 à 3 conseils ciblés pour bien gérer son temps, respecter les rappels et éviter la procrastination.
4. focusQuote: Une citation inspirante courte.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendedOrder: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              focusQuote: { type: Type.STRING },
            },
            required: ['summary', 'recommendedOrder', 'tips', 'focusQuote'],
          },
        },
      });

      const advice = JSON.parse(response.text || '{}');
      return NextResponse.json({ advice });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la génération avec Gemini' },
      { status: 500 }
    );
  }
}
