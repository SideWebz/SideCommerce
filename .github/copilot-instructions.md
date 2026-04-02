# SideCommerce Copilot Instructions

These instructions apply to this repository by default.

## API Endpoint Contract
- Build endpoints in `src/app/api/**/route.ts` with predictable JSON response bodies.
- For success responses, return `NextResponse.json({ message, ...data })` with HTTP `200` by default.
- For validation errors, return JSON with an explicit status code (`400`, `409`, etc.).
- For unauthenticated requests, return JSON with status `401` and include `redirectTo` when the client should navigate.
- Avoid redirect-based message passing (`?error=...` or flash-cookie message transport) for app API flows.
- Keep endpoint logic simple and explicit: validate input, check auth, perform DB action, return JSON.

## Client Form Handling
- For auth/settings forms, use client-side `fetch` to API endpoints and consume JSON response bodies.
- Use response body `message` for user feedback UI.
- Use optional response body `redirectTo` for client navigation when needed.

## Styling System
- Use Bootstrap as the UI framework.
- Prefer Bootstrap utility and component classes (`container`, `row`, `card`, `btn`, `form-control`, `alert`, etc.).
- Keep visual style clean and modern: neutral colors, clear spacing, minimal shadows.
- Avoid Tailwind classes and Tailwind config unless user explicitly asks to reintroduce Tailwind.

## UI Structure
- Keep pages compact and readable.
- Use a consistent top navbar style and consistent form/card sections across auth and settings pages.
- Prefer reusable components for repeated UI blocks.

## Safety and Verification
- After endpoint or styling changes, run `npm run build` and fix all compile/type issues.
- Do not introduce breaking API response format changes without updating all client handlers.
