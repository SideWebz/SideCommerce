---
name: product-admin-ui
description: "Use when: building product management pages with Bootstrap, including list, create/edit forms, variant builder sections, and linked product selector UX for the existing app."
---

# Product Admin UI Skill

Use this skill when creating or updating product management screens in this repository.

## Purpose
Provide a consistent product admin experience using existing UI conventions.

## Use When
- Building product list page.
- Building create/edit product forms.
- Adding variant builder controls.
- Adding linked product selector controls.

## UI Direction
- Follow existing Bootstrap card/form patterns used in settings/store pages.
- Use server components for page data loading and client components for interactive forms.
- Submit via `fetch` and consume JSON `message` feedback.

## Required Screens
1. Product list page
- Search/filter-ready structure.
- Empty state with create CTA.

2. Product create/edit form
- Basic info section.
- Product type selector (`SIMPLE`/`VARIABLE`).
- Conditional fields by type.

3. Variant builder UI
- Repeating rows/cards for variants.
- Add/remove row actions.
- Inline validation feedback.

4. Linked product selector
- Multi-select/search picker from same store.
- Clear current links list with remove actions.

## Interaction Rules
- If no store exists, block product creation and show clear CTA to create store first.
- For `VARIABLE` type, hide or disable authoritative product-level price/stock inputs.
- For `SIMPLE` type, hide variant builder.
- Keep destructive actions in a danger-styled section.

## Implementation Checklist
1. Build page shell with `container`, `card`, and consistent spacing.
2. Create typed client form state for product payload.
3. Wire to API routes with JSON response handling.
4. Add optimistic or refresh-based updates after save.
5. Ensure mobile readability for all form sections.

## Feedback Pattern Example
```txt
Success: alert-success using API message.
Failure: alert-danger using API message.
After save: router.refresh() or navigate to detail/list.
```