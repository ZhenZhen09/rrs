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
  // Defensive: Handle null or empty input (Enterprise Hardening)
  if (!d) return '';

  if (typeof d === 'string') {
    // 1. Check for YYYY-MM-DD format FIRST (Strict check)
    const dateMatch = d.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }

    // 2. If it's an ISO string (contains T but didn't match regex exactly), 
    // we only split if it actually looks like an ISO string (starts with digit)
    if (d.includes('T') && /^\d/.test(d)) {
      return d.split('T')[0];
    }

    // If it reached here, it's a malformed string (like "NOT-A-DATE")
    return ''; 
  }
  
  // 3. For Date objects, extract local parts to stay in local context.
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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
