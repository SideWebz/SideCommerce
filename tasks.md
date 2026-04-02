# Product Management Implementation Tasks

## Phase 1 – Database & Models

### Task 1: Create Product Model

* Add product table/schema
* Fields:

  * id
  * name
  * brand
  * description
  * timestamps

---

### Task 2: Create Variant Model

* Add variant table/schema
* Fields:

  * id
  * product_id (relation)
  * name
  * price
  * stock

---

### Task 3: Create Product Image Model

* Fields:

  * id
  * product_id
  * file_path
  * order (optional)

---

### Task 4: Create Product Linking Model

* Many-to-many relationship
* Fields:

  * id
  * product_id
  * linked_product_id
  * relation_type

---

## Phase 2 – Backend Logic

### Task 5: Create Product API (CRUD)

* Create product
* Get all products
* Get single product
* Update product
* Delete product

---

### Task 6: Variant API Logic

* Add variants
* Update variants
* Delete variants
* Link to product

---

### Task 7: Image Upload System

* Implement file upload endpoint
* Store images locally or cloud
* Validate:

  * max 4 images
* Return file path

---

### Task 8: Image Deletion Logic

* Delete from database
* Delete physical file from storage

---

### Task 9: Product Linking Logic

* Add linked products
* Remove linked products
* Fetch linked products

---

## Phase 3 – Frontend

### Task 10: Product List Page

* Table/grid view
* Show:

  * name
  * brand
  * image
  * price (or "from")
  * stock
* Actions:

  * edit
  * delete
  * add

---

### Task 11: Create Product Page (Base Info)

* Form:

  * name
  * brand
  * description
  * image upload (max 4)

---

### Task 12: Product Type Toggle

* Simple vs Variable
* Conditional rendering

---

### Task 13: Simple Product Fields

* price
* stock

---

### Task 14: Variant Builder Component

* Add/remove variants
* Inputs:

  * name
  * price
  * stock

---

### Task 15: Linked Products UI

* Search existing products
* Select and attach
* Show selected linked products

---

### Task 16: Edit Product Page

* Load full product data
* Allow editing:

  * base info
  * images
  * variants
  * linked products

---

### Task 17: Delete Product Flow

* Confirmation dialog
* Call delete API
* Refresh list

---

## Phase 4 – Polish

### Task 18: Validation

* Required fields
* Max images
* Valid price/stock

---

### Task 19: Error Handling

* API errors
* Upload errors
* UI feedback

---

### Task 20: Cleanup & Refactor

* Reusable components
* Code cleanup
* Consistency
