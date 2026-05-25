/**
 * Parses a YYYY-MM-DD string into a local Date object.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();

  // Delivery dates are calendar dates, not instants. Preserve the date portion
  // even when the API/database returns an ISO timestamp at midnight UTC.
  const cleanDateStr = dateStr.substring(0, 10);
  const [year, month, day] = cleanDateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Returns the current date as a YYYY-MM-DD string in local time.
 */
export const getLocalDateStr = (d: Date | string = new Date()): string => {
  // 1. If it's already an ISO string with a T, extract the date portion directly.
  // This is the CRITICAL fix for the "Midnight Date Shift" bug.
  // It ensures 2026-05-25T23:59:59Z stays 2026-05-25, never shifting.
  if (typeof d === 'string' && d.includes('T')) {
    return d.split('T')[0];
  }

  // 2. If it's a simple date string already, just return the first 10 chars.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    return d.substring(0, 10);
  }
  
  // 3. For Date objects (like new Date()), extract local parts to stay in local context.
  const date = typeof d === 'string' ? new Date(d) : d;
  
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
