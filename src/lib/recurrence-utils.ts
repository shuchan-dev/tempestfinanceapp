/**
 * lib/recurrence-utils.ts — Handle recurring transaction logic
 * Uses RRULE format for standardization
 */

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  byMonthDay?: number; // For MONTHLY: day of month (1-31)
  byDayOfWeek?: number; // For WEEKLY: 0=Sunday, 6=Saturday
  endDate?: Date; // Optional end date
}

/**
 * Generate RRULE string from frequency
 * Example: frequency=MONTHLY, byMonthDay=5 -> "FREQ=MONTHLY;BYMONTHDAY=5"
 */
export function configToRRULE(config: RecurrenceConfig): string {
  let rrule = `FREQ=${config.frequency}`;

  if (config.byMonthDay && config.frequency === "MONTHLY") {
    rrule += `;BYMONTHDAY=${config.byMonthDay}`;
  }

  if (config.byDayOfWeek !== undefined && config.frequency === "WEEKLY") {
    rrule += `;BYDAY=${config.byDayOfWeek}`;
  }

  if (config.endDate) {
    const dateStr = config.endDate
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");
    rrule += `;UNTIL=${dateStr}`;
  }

  return rrule;
}

/**
 * Parse RRULE string back to config
 */
export function rruleToConfig(rrule: string): RecurrenceConfig {
  const parts = rrule.split(";").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );

  return {
    frequency: parts.FREQ as RecurrenceFrequency,
    byMonthDay: parts.BYMONTHDAY ? parseInt(parts.BYMONTHDAY) : undefined,
    byDayOfWeek: parts.BYDAY ? parseInt(parts.BYDAY) : undefined,
    endDate: parts.UNTIL ? new Date(parts.UNTIL) : undefined,
  };
}

/**
 * Calculate next occurrence of a recurring transaction
 */
export function getNextOccurrence(
  lastDate: Date,
  config: RecurrenceConfig,
): Date | null {
  const next = new Date(lastDate);

  switch (config.frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      if (config.byMonthDay) {
        // Move to next month's same day
        next.setMonth(next.getMonth() + 1);
        next.setDate(config.byMonthDay);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  // Check if within end date
  if (config.endDate && next > config.endDate) {
    return null;
  }

  return next;
}

/**
 * Generate all occurrences from start date within a range
 */
export function generateOccurrences(
  startDate: Date,
  config: RecurrenceConfig,
  uptoDate: Date,
  maxCount: number = 100,
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);

  while (occurrences.length < maxCount) {
    if (current > uptoDate) break;
    if (config.endDate && current > config.endDate) break;

    occurrences.push(new Date(current));
    const next = getNextOccurrence(current, config);
    if (!next) break;

    current = next;
  }

  return occurrences;
}

/**
 * Check if today is due for a recurring transaction
 */
export function isDueToday(recurrenceRule: string, lastDate: Date): boolean {
  const config = rruleToConfig(recurrenceRule);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextOccurrence = getNextOccurrence(lastDate, config);
  if (!nextOccurrence) return false;

  nextOccurrence.setHours(0, 0, 0, 0);
  return nextOccurrence.getTime() === today.getTime();
}
