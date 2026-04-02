---
name: product-linking-system
description: "Use when: implementing related product linking, add/remove link endpoints, and retrieval of linked product sets with clear bidirectional management."
---

# Product Linking System Skill

Use this skill for many-to-many relationships between products.

## Purpose
Create predictable linked-product behavior for recommendation and cross-sell use cases.

## Use When
- Building add/remove linked product endpoints.
- Querying linked products for product detail/admin pages.
- Enforcing no-duplicate and no-self-link constraints.

## Link Direction Policy
Choose one and keep it explicit:
1. Symmetric links (recommended):
- Adding A to B also creates B to A.
- Removing either direction removes both rows.

2. Directional links:
- Store one row and always query by chosen direction.
- UI must clearly communicate direction.

Use symmetric policy by default unless repository requirements say otherwise.

## Constraints
- No self-link (`productId !== linkedProductId`).
- No duplicate links (composite unique index).
- Linked products must belong to the same store unless cross-store linking is explicitly enabled.

## API Guidance
- `POST /api/products/link/add`
- `POST /api/products/link/remove`
- `GET /api/products/[id]/links`

## Transaction Rules
- For symmetric mode, create/delete both directions in one transaction.
- Return link counts to keep UI state simple.

## Implementation Checklist
1. Validate ownership of both product IDs.
2. Validate no self-link.
3. Upsert or delete links in transaction.
4. Return stable JSON payload.

## Example Response
```json
{ "message": "Linked products updated", "linkedCount": 5 }
```