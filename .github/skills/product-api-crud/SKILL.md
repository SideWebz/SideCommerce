---
name: product-api-crud
description: "Use when: implementing product create/read/update/delete endpoints with JSON contracts, validation, and product-type-aware behavior for simple and variable products."
---

# Product API CRUD Skill

Use this skill for API endpoints under `src/app/api/products/**` in the current project structure.

## Purpose
Provide stable CRUD behavior for products while respecting product type and store ownership.

## Use When
- Building create, list, detail, update, delete product routes.
- Enforcing product input validation.
- Supporting both simple and variable products.

## Endpoint Contract
- Success: `NextResponse.json({ message, ...data })`.
- Validation failures: `400` with `message`.
- Unauthorized: `401` with `message` (and `redirectTo` if client navigation is required).
- Forbidden (wrong store ownership): `403`.
- Missing product: `404`.

## Required Endpoints
1. `POST /api/products/create`
2. `GET /api/products/list`
3. `GET /api/products/[id]`
4. `POST /api/products/update`
5. `POST /api/products/delete`

## Validation Rules
- `name` required and trimmed.
- `type` must be `SIMPLE` or `VARIABLE`.
- Simple product:
- `price` and `stock` required at product level.
- `variants` must be empty.
- Variable product:
- `variants` required and non-empty.
- Product-level `price` and `stock` treated as non-authoritative.
- `storeId` must belong to authenticated user.

## Consistency Rules
- Reject mixed payloads that provide both authoritative product-level price/stock and authoritative variants.
- Ensure SKU uniqueness according to repo policy (global or per store).
- Return stable payload fields so client forms remain predictable.

## Implementation Checklist
1. Resolve authenticated user and store ownership.
2. Validate payload by type.
3. Run uniqueness checks (slug/SKU if used).
4. Perform DB mutation in a transaction when variants/images/links are included.
5. Return JSON response with clear `message` and IDs needed by UI.

## Response Examples
```json
{ "message": "Product created", "productId": "prod_123" }
```

```json
{ "message": "Invalid payload: variants required for VARIABLE product" }
```