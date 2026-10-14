type MessagingErrorShape = {
  code?: unknown;
  message?: unknown;
  request?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
    headers?: unknown;
  };
  status?: unknown;
};

const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MIN_RETRY_AFTER_SECONDS = 1;
const MAX_RETRY_AFTER_SECONDS = 300;

const asMessagingError = (error: unknown): MessagingErrorShape | undefined => (
  error !== null && typeof error === 'object' ? error as MessagingErrorShape : undefined
);

const getHeader = (headers: unknown, name: string): unknown => {
  if (!headers || typeof headers !== 'object') return undefined;

  const headerBag = headers as { [key: string]: unknown };
  try {
    const getter = headerBag.get;
    if (typeof getter === 'function') {
      const viaGetter: unknown = getter.call(headerBag, name);
      if (typeof viaGetter === 'string' || typeof viaGetter === 'number') return viaGetter;
    }
  } catch {
    // Fall back to plain-object access when an Axios-compatible getter is malformed.
  }

  try {
    const key = Object.keys(headerBag).find((candidate) => candidate.toLowerCase() === name);
    return key ? headerBag[key] : undefined;
  } catch {
    return undefined;
  }
};

const clampRetryAfter = (seconds: number): number => Math.min(
  MAX_RETRY_AFTER_SECONDS,
  Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(seconds)),
);

export const isRetryableMessagingError = (error: unknown): boolean => {
  const shapedError = asMessagingError(error);
  if (!shapedError) return false;

  const status = shapedError.response?.status ?? shapedError.status;
  if (typeof status === 'number') return status >= 500 && status <= 599;

  const code = typeof shapedError.code === 'string' ? shapedError.code.toUpperCase() : '';
  if (['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ENETUNREACH', 'ECONNRESET'].includes(code)) return true;
  if (shapedError.request && !shapedError.response) return true;

  return typeof shapedError.message === 'string' && /network error|network request failed/i.test(shapedError.message);
};

export const getMessagingRetryAfterSeconds = (error: unknown, nowMs = Date.now()): number => {
  const value = getHeader(asMessagingError(error)?.response?.headers, 'retry-after');
  if (typeof value !== 'string' && typeof value !== 'number') return DEFAULT_RETRY_AFTER_SECONDS;

  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0
      ? clampRetryAfter(value)
      : DEFAULT_RETRY_AFTER_SECONDS;
  }

  const trimmedValue = value.trim();
  if (/^\d+$/.test(trimmedValue)) {
    const numericSeconds = Number(trimmedValue);
    return Number.isFinite(numericSeconds) ? clampRetryAfter(numericSeconds) : DEFAULT_RETRY_AFTER_SECONDS;
  }

  // Date.parse accepts non-date numeric syntax (for example, "-2") as dates
  // in some runtimes, so reject numeric-like values before HTTP-date parsing.
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmedValue)
    || /^0[xob][\da-f]+$/i.test(trimmedValue)) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  const isImfFixdate = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(trimmedValue);
  if (!isImfFixdate) return DEFAULT_RETRY_AFTER_SECONDS;

  const dateMs = Date.parse(trimmedValue);
  if (!Number.isFinite(dateMs) || new Date(dateMs).toUTCString() !== trimmedValue) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }
  return clampRetryAfter((dateMs - nowMs) / 1000);
};

export const getMessagingErrorMessage = (error: unknown): string => {
  const shapedError = asMessagingError(error);
  const status = shapedError?.response?.status ?? shapedError?.status;

  if (status === 429) {
    const seconds = getMessagingRetryAfterSeconds(error);
    return `Too many messages. Please try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  }

  const responseData = shapedError?.response?.data;
  if (responseData && typeof responseData === 'object') {
    const serverMessage = (responseData as { message?: unknown }).message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  }

  if (typeof shapedError?.message === 'string' && shapedError.message.trim()) return shapedError.message;
  return 'Unable to send message. Please try again.';
};
