---
name: product-variant-management
description: "Use when: implementing add/edit/remove variant flows, validating variant payloads, and enforcing strict consistency between product type and variant data."
---

# Product Variant Management Skill

Use this skill when handling variant operations for variable products.

## Purpose
Manage variant lifecycle safely:
- Add variants
- Edit variants
- Remove variants
- Keep product type rules consistent

## Use When
- You build variant API endpoints or service functions.
- You update variant editor UI behavior.
- You need transactional updates for variant sets.

## Core Rules
- Variants are allowed only when product type is `VARIABLE`.
- `SIMPLE` products must not keep any variants.
- A `VARIABLE` product must always have at least one variant.
- Variant fields should include at minimum identifier, price, stock, and option signature.

## Validation Rules
- `price >= 0` and `stock >= 0`.
- Option signature unique per product.
- SKU uniqueness based on repo policy.
- Reject partial variant payloads missing required fields.

## Update Strategy
- Prefer full replacement transaction for variant arrays:
1. Validate full incoming set.
2. Delete removed variants.
3. Update existing variants.
4. Insert new variants.
5. Recompute product-level derived values (if your app displays min/max price).

## Type Transition Rules
- SIMPLE to VARIABLE:
- Require at least one valid variant in same request.
- Nullify or ignore authoritative product-level price/stock.
- VARIABLE to SIMPLE:
- Require canonical product-level price/stock in same request.
- Delete all variants in transaction.

## Implementation Checklist
1. Fetch product with ownership check.
2. Validate product type transition rules.
3. Validate variant payload integrity.
4. Execute transaction.
5. Return JSON with updated counts and status message.

## Example Result
```json
{ "message": "Variants updated", "variantCount": 3 }
```