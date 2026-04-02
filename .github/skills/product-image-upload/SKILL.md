---
name: product-image-upload
description: "Use when: implementing file-based product image upload endpoints, enforcing max 4 images per product, and hard deleting image files from storage when removed."
---

# Product Image Upload Skill

Use this skill for file upload and deletion flows for product images.

## Purpose
Handle product images as uploaded files only, with safe storage lifecycle.

## Use When
- Creating upload/delete image APIs.
- Wiring product image sections in admin UI.
- Enforcing storage cleanup guarantees.

## Hard Rules
- Accept file uploads only. Do not use URL-based image input.
- Maximum 4 images per product.
- Deleting an image must hard delete file from storage and remove DB record.
- Only authenticated store owners can mutate image sets.

## Data Handling
- Persist storage metadata (`storageKey`, `filename`, `mimeType`, `sizeBytes`).
- Do not persist raw binary in DB.
- Keep display URL generation separate from storage key.

## Validation Rules
- Reject unsupported mime types.
- Enforce max file size per file according to project policy.
- Reject upload when current image count is already 4.

## API Flow
1. Authenticate user and verify store/product ownership.
2. Parse multipart form data.
3. Validate file constraints.
4. Upload file to storage provider.
5. Create `ProductImage` row.
6. Return JSON with image metadata.

## Deletion Flow
1. Authenticate and verify ownership.
2. Fetch image by ID and product association.
3. Delete file from storage first.
4. Delete image row from DB.
5. Return JSON success message.

## Failure Handling
- If storage upload fails: do not create DB row.
- If DB insert fails after upload: attempt storage rollback.
- If storage delete fails: return error and keep DB row unchanged.

## Example Response
```json
{ "message": "Image uploaded", "image": { "id": "img_1", "storageKey": "products/prod_1/a.jpg" } }
```