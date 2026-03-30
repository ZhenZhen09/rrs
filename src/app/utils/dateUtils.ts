import { format } from 'date-fns';

/**
 * Parses a YYYY-MM-DD string into a local Date object.
 * This avoids the common "date-shifting" bug where new Date('YYYY-MM-DD')
 * is interpreted as UTC and then shifts to the previous day in local time.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.substring(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats a YYYY-MM-DD string into a human-readable format.
 */
export const formatLocalDate = (dateStr: string, formatStr: string = 'MMMM d, yyyy'): string => {
  try {
    return format(parseLocalDate(dateStr), formatStr);
  } catch (e) {
    return dateStr;
  }
};

/**
 * Returns the current date as a YYYY-MM-DD string in local time.
 */
export const getLocalDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Formats a full timestamp (ISO or MySQL format) into a human-readable date and time.
 */
export const formatDateTime = (dateStr: string, formatStr: string = 'MMM d, yyyy h:mm a'): string => {
  if (!dateStr) return 'N/A';
  try {
    let date: Date;
    if (dateStr.includes(' ') && !dateStr.includes('T') && !dateStr.includes('Z')) {
      // Handle MySQL "YYYY-MM-DD HH:MM:SS" format
      date = new Date(dateStr.replace(' ', 'T') + 'Z');
    } else {
      date = new Date(dateStr);
    }
    return format(date, formatStr);
  } catch (e) {
    return dateStr;
  }
};
