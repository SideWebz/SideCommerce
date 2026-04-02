---
name: api-endpoint-contract
description: "Use when: creating or editing Next.js API routes, login/register endpoints, settings/update endpoints, JSON response contracts, auth API behavior, validation status codes, or client/server API integration."
---

# API Endpoint Contract Skill

Use this skill when implementing or updating routes in `src/app/api/**/route.ts`.

## Rules
- Return JSON response bodies for all normal API outcomes.
- Success shape: `{ message: string, ...optionalData }`.
- Error shape: `{ message: string, ...optionalFields }` with meaningful status code.
- Unauthorized shape: `{ message: "Unauthorized", redirectTo: "/login" }` with `401` when client navigation is needed.
- Avoid redirect-message patterns (`?error=...`, flash-message cookies) for API workflows.

## Status Code Guide
- `200`: success.
- `400`: invalid input.
- `401`: not authenticated.
- `403`: authenticated but not allowed.
- `404`: missing entity.
- `409`: conflict (duplicate email/phone, etc.).
- `500`: unexpected server error.

## Implementation Checklist
1. Validate and sanitize form/body input.
2. Resolve current user/session if required.
3. Perform uniqueness/constraint checks.
4. Execute database mutation.
5. Return `NextResponse.json()` with stable payload shape.
6. Keep payload keys stable so client handlers stay predictable.

## Client Integration Pattern
- Submit form with `fetch(endpoint, { method: "POST", body: formData, credentials: "include" })`.
- Parse JSON and display `message`.
- If payload includes `redirectTo`, navigate client-side.
