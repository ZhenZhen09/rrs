# Mobile Messaging Rate-Limit Resilience Design

## Goal

Prevent duplicate mobile message submissions and retry storms from producing the inbox error `Too many messages. Please try again later.` while retaining server-side abuse protection.

## Scope

- Mobile message sending and retry behavior.
- Mobile handling of HTTP 429 responses.
- Server `Retry-After` metadata for the existing message limiter.
- Tests for retry classification, cooldown parsing, and rate-limit responses.

Out of scope: changing authentication, changing conversation permissions, redesigning the inbox UI, or raising the default limit without evidence.

## Design

The server keeps a limit of 30 `POST /api/conversations/:id/messages` requests per authenticated user per 60 seconds. The limiter response includes `Retry-After` so clients know when to retry.

The mobile client treats errors as follows:

- 400, 403, 409, and 429 are not automatically retried.
- Network failures and 5xx responses may be retried by an explicit user retry action.
- A 429 is represented with a retry-after duration and a user-facing cooldown message.
- A message remains idempotent through its valid `clientMessageId`; duplicate sends are blocked while the composer is already sending.

The existing mobile UUID fallback remains the source of valid client IDs. The implementation should be additive and avoid changing the conversations API payload.

## Success Criteria

- One user tap produces at most one in-flight send request.
- A 429 does not trigger an automatic retry loop.
- The mobile UI tells the user when retrying is allowed.
- Server responses expose a usable retry duration.
- Existing messaging, retry, and authentication tests remain green.
