import {
  getMessagingErrorMessage,
  getMessagingRetryAfterSeconds,
  isRetryableMessagingError,
} from '../messagingRateLimit';

describe('messaging rate-limit utilities', () => {
  it.each([503, 500])('allows explicit retry for HTTP %i errors', (status) => {
    expect(isRetryableMessagingError({ response: { status } })).toBe(true);
  });

  it.each(['ERR_NETWORK', 'ECONNABORTED'])('allows explicit retry for network error %s', (code) => {
    expect(isRetryableMessagingError({ code })).toBe(true);
  });

  it.each([400, 403, 409, 429])('does not retry HTTP %i errors', (status) => {
    expect(isRetryableMessagingError({ response: { status } })).toBe(false);
  });

  it('parses a numeric Retry-After header', () => {
    expect(getMessagingRetryAfterSeconds({ response: { headers: { 'retry-after': '45' } } })).toBe(45);
  });

  it('uses the fallback for a fractional numeric Retry-After header', () => {
    expect(getMessagingRetryAfterSeconds({ response: { headers: { 'retry-after': 1.5 } } })).toBe(60);
  });

  it.each(['-2', '1.5', '1e2', '0x10'])('uses the fallback for non-decimal Retry-After value %s', (header) => {
    expect(getMessagingRetryAfterSeconds({ response: { headers: { 'retry-after': header } } })).toBe(60);
  });

  it('preserves AxiosHeaders-style get() support', () => {
    expect(getMessagingRetryAfterSeconds({
      response: { headers: { get: (name: string) => name === 'retry-after' ? '45' : undefined } },
    })).toBe(45);
  });

  it('falls back to a plain header when AxiosHeaders-style get() throws', () => {
    expect(getMessagingRetryAfterSeconds({
      response: { headers: {
        get: () => { throw new Error('malformed header bag'); },
        'retry-after': '45',
      } },
    })).toBe(45);
  });

  it('uses the default when a malformed AxiosHeaders-style get() has no plain header', () => {
    expect(getMessagingRetryAfterSeconds({
      response: { headers: { get: 'not a function' } },
    })).toBe(60);
  });

  it('parses an HTTP-date Retry-After relative to nowMs', () => {
    const nowMs = Date.parse('2026-10-03T10:00:00.000Z');
    const error = { response: { headers: { 'Retry-After': 'Sat, 03 Oct 2026 10:01:30 GMT' } } };

    expect(getMessagingRetryAfterSeconds(error, nowMs)).toBe(90);
  });

  it('uses the fallback for an ISO timestamp Retry-After value', () => {
    const nowMs = Date.parse('2026-10-03T10:00:00.000Z');
    const error = { response: { headers: { 'Retry-After': '2026-10-03T10:01:30Z' } } };

    expect(getMessagingRetryAfterSeconds(error, nowMs)).toBe(60);
  });

  it.each([
    undefined,
    { response: { headers: {} } },
    { response: { headers: { 'retry-after': 'not a date' } } },
  ])('falls back to 60 seconds when Retry-After is missing or invalid', (error) => {
    expect(getMessagingRetryAfterSeconds(error)).toBe(60);
  });

  it.each([
    ['0', 1],
    ['900', 300],
  ])('clamps Retry-After %s to %i seconds', (header, expected) => {
    expect(getMessagingRetryAfterSeconds({ response: { headers: { 'retry-after': header } } })).toBe(expected);
  });

  it('gives HTTP 429 a user-facing try-again message', () => {
    expect(getMessagingErrorMessage({ response: { status: 429 } })).toMatch(/try again/i);
  });

  it('preserves a useful server error message for other errors', () => {
    expect(getMessagingErrorMessage({ response: { data: { message: 'Message was rejected' } } })).toBe('Message was rejected');
  });
});
