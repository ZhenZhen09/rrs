# Security Penetration Testing Spec

**Target URL:** `https://rrs-vhgr.onrender.com/`
**Auditor:** Gemini CLI Agent
**Focus:** AI-Resilient Hardening & OWASP Compliance (Non-MFA)
**Date:** May 18, 2026

## 1. Overview
This spec defines the methodology and test cases for a non-destructive security audit of the Rider Scheduling System. The goal is to identify vulnerabilities that could be exploited by human hackers or automated AI agents.

## 2. Test Scope & Methodology

### 2.1 API & Business Logic (BOLA/IDOR)
*   **Objective:** Prevent unauthorized data access via ID manipulation.
*   **Methodology:**
    *   Attempt to access a Job ID not assigned to the current user via `/api/requests/:id`.
    *   Attempt to modify a request status (e.g., set to 'completed') for a Job ID not assigned to the user.
    *   Verify that file-based resources (signatures/photos) use non-predictable UUIDs.

### 2.2 Authentication & Session Security
*   **Objective:** Harden the "front door" against credential stuffing and session theft.
*   **Methodology:**
    *   Test rate-limiting on the `/api/auth/login` endpoint (10+ rapid failures).
    *   Inspect JWT structure for strong signatures and expiration (Exp) claims.
    *   Verify `HttpOnly` and `Secure` flags on session cookies.

### 2.3 Real-Time Socket Security (Socket.io)
*   **Objective:** Prevent data leakage or spoofing in real-time streams.
*   **Methodology:**
    *   Attempt to "Join" the `admin-room` using a non-admin `user_id`.
    *   Attempt to emit `update-location` events with a mismatching `rider_id`.

### 2.4 Injection & Infrastructure
*   **Objective:** Protect the database and client from automated fuzzer payloads.
*   **Methodology:**
    *   Probe search fields and remark inputs for SQL Injection patterns.
    *   Check for standard security headers: `Content-Security-Policy`, `HSTS`, `X-Content-Type-Options`.

## 3. Safety & Integrity Mandates
*   **No Load Testing:** No stress tests or volume-based attacks.
*   **No Data Deletion:** Only `GET` or non-destructive `POST` probing allowed.
*   **Production Continuity:** Testing must not cause downtime or performance degradation for live users.

## 4. Expected Output
A detailed **Security Audit Report** highlighting found vulnerabilities, their severity (Critical/High/Medium/Low), and technical remediation steps.
