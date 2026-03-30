/**
 * Parses a YYYY-MM-DD string into a local Date object.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // If it's a full ISO string, use the Date constructor which handles UTC to local conversion
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }

  // Handle YYYY-MM-DD (or extract date part from other formats) as local midnight
  const cleanDateStr = dateStr.substring(0, 10);
  const [year, month, day] = cleanDateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Returns the current date as a YYYY-MM-DD string in local time.
 */
export const getLocalDateStr = (d: Date | string = new Date()): string => {
  // If it's strictly a YYYY-MM-DD string (10 chars), assume it's already local
  if (typeof d === 'string' && d.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }
  
  // Parse string to Date (ISO strings will be parsed as UTC and converted to local by Date object)
  // Non-ISO strings like "2024-03-09" (length 10) are handled above.
  const date = typeof d === 'string' ? new Date(d) : d;
  
  // If invalid date, fallback to original behavior or empty
  if (isNaN(date.getTime())) {
    return typeof d === 'string' ? d.substring(0, 10) : '';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Formats a YYYY-MM-DD string for display.
 */
export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
};
