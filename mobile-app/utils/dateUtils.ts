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
  // Delivery dates are persisted as YYYY-MM-DD calendar values. If a backend
  // serializes one as an ISO timestamp, keep the calendar date stable instead
  // of shifting it through the device timezone.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    return d.substring(0, 10);
  }
  
  // Parse input to Date object. 
  // If 'd' is an ISO string (e.g. 2024-03-30T16:00:00.000Z), 
  // the Date constructor converts it to the user's LOCAL time.
  const date = typeof d === 'string' ? new Date(d) : d;
  
  if (isNaN(date.getTime())) {
    return typeof d === 'string' ? d.substring(0, 10) : '';
  }

  // Extract local parts
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
