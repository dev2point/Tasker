/**
 * Utilitaires pour le calcul d'échéances et la validation stricte des dates/heures futures.
 */

export function formatLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatLocalTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Construit un objet Date local à partir d'une date (YYYY-MM-DD) et d'une heure optionnelle (HH:mm).
 * Si aucune heure n'est spécifiée, l'échéance par défaut de la journée est 23:59:59.
 */
export function parseLocalDateTime(dateStr: string, timeStr?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (timeStr && timeStr.trim()) {
    const parts = timeStr.trim().split(':').map(Number);
    hours = Number.isFinite(parts[0]) ? parts[0] : 0;
    minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
    seconds = 0;
  }

  return new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds, 0);
}

/**
 * Calcule l'échéance par défaut selon la spécification :
 * Heure actuelle + 2 heures, arrondie à l'heure pleine suivante.
 * Ex: 18:25 -> 20:25 -> arrondie à 21:00.
 * Si dépassement après 22h, bascule automatiquement au jour suivant si nécessaire.
 */
export function getDefaultDueDateTime(baseDate: Date = new Date()): { dueDate: string; dueTime: string } {
  const target = new Date(baseDate);

  // Ajouter 2 heures
  target.setHours(target.getHours() + 2);

  // Arrondir à l'heure pleine suivante si minutes ou secondes > 0
  if (target.getMinutes() > 0 || target.getSeconds() > 0 || target.getMilliseconds() > 0) {
    target.setHours(target.getHours() + 1);
  }
  target.setMinutes(0, 0, 0);

  return {
    dueDate: formatLocalDate(target),
    dueTime: formatLocalTime(target),
  };
}

/**
 * Détermine si une échéance donnée (date + heure optionnelle) est révolue (dans le passé).
 * @param dueDate Date au format 'YYYY-MM-DD'
 * @param dueTime Heure au format 'HH:mm' (optionnelle)
 * @param referenceDate Date de référence (par défaut maintenant)
 * @param toleranceMs Marge de tolérance (60 000 ms = 1 min pour éviter faux-positifs à la seconde près)
 */
export function isDueDateTimeInPast(
  dueDate: string,
  dueTime?: string,
  referenceDate: Date = new Date(),
  toleranceMs: number = 60000
): boolean {
  if (!dueDate) return false;

  const targetDate = parseLocalDateTime(dueDate, dueTime);
  const refTime = referenceDate.getTime();

  // Si l'échéance cible est strictement inférieure à l'heure de référence moins la marge
  return targetDate.getTime() < refTime - toleranceMs;
}

/**
 * Retourne la date minimale sélectionnable pour une nouvelle tâche (aujourd'hui en local).
 */
export function getMinDateStr(referenceDate: Date = new Date()): string {
  return formatLocalDate(referenceDate);
}

/**
 * Retourne l'heure minimale sélectionnable pour une date donnée.
 * Si la date sélectionnée est aujourd'hui, l'heure minimale est l'heure courante (HH:mm).
 * Si la date sélectionnée est future, aucune heure minimale n'est imposée (undefined).
 */
export function getMinTimeForDate(selectedDateStr: string, referenceDate: Date = new Date()): string | undefined {
  const todayStr = formatLocalDate(referenceDate);
  if (selectedDateStr === todayStr) {
    return formatLocalTime(referenceDate);
  }
  return undefined;
}
