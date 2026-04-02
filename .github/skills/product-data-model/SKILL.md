---
name: product-data-model
description: "Use when: defining or updating Product, Variant, ProductImage, and ProductLink models; enforcing data constraints; and aligning product schema with existing SideCommerce auth/store patterns."
---

# Product Data Model Skill

Use this skill when creating or refining product-related database structure in the existing repository.

## Purpose
Define a robust schema for:
- Products (base entity)
- Variants (optional)
- Images (uploaded files, max 4)
- Linked products (many-to-many)

## Use When
- You add product models to Prisma.
- You change product relationships.
- You need strict consistency rules for simple vs variable products.

## Model Guidelines
- Attach each product to a store and owner context already present in this codebase.
- Keep one canonical `Product` record for shared fields.
- Use `ProductVariant` only when product type is variable.
- Store image metadata in `ProductImage`; store only storage path/key, not external URL source.
- Implement product linking with a dedicated join table.

## Suggested Entities
1. `Product`
- `id`, `storeId`, `name`, `description`, `type`, `createdAt`, `updatedAt`
- For simple products: product-level price and stock are required.
- For variable products: product-level price and stock are nullable and derived from variants.

2. `ProductVariant`
- `id`, `productId`, `title`, `sku`, `price`, `stock`, `createdAt`, `updatedAt`
- Unique constraints to prevent duplicate option combinations per product.

3. `ProductImage`
- `id`, `productId`, `storageKey`, `filename`, `mimeType`, `sizeBytes`, `sortOrder`, `createdAt`
- Limit 4 images per product at API/service layer.

4. `ProductLink`
- `id`, `productId`, `linkedProductId`, `createdAt`
- Composite unique index on `(productId, linkedProductId)`.
- Disallow self-links.

## Relationship Rules
- Product to Variant: one-to-many.
- Product to Image: one-to-many.
- Product to ProductLink: one-to-many in each direction.
- Linked products must be symmetric or managed with explicit directional policy.

## Constraints
- Product type enum: `SIMPLE | VARIABLE`.
- If type is `SIMPLE`: no variants allowed.
- If type is `VARIABLE`: at least one variant required, and product-level price/stock should not be authoritative.
- Max 4 images per product.
- Deleting a product must cascade-delete variants, image rows, and link rows.

## Implementation Checklist
1. Add models and relations in Prisma schema.
2. Add indexes for `storeId`, `productId`, and link uniqueness.
3. Add migration with safe defaults for existing data.
4. Regenerate Prisma client.
5. Verify model usage from API routes before UI integration.

## Example Policy Snippet
```txt
SIMPLE product: Product.price + Product.stock used directly.
VARIABLE product: ProductVariant[].price + ProductVariant[].stock are source of truth.
Image source: uploaded file only, persisted by storageKey.
```