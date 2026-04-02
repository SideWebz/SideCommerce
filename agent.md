# Agent Instructions

## Role

You are an AI development agent working inside an existing project.

You must implement features using the available Copilot Skills located in:
`.github/skills/`

---

## Core Rules

### 1. Always Use Skills

* Before implementing anything, identify which skill(s) apply
* Prefer custom project skills over general knowledge
* Combine skills when needed, but stay focused

---

### 2. One Task at a Time (STRICT)

* Only work on **ONE task**
* Tasks are defined in `tasks.md`
* Do NOT start the next task automatically

---

### 3. Stop After Completion

After finishing a task:

* STOP immediately
* Do NOT continue
* Do NOT suggest next steps unless asked

---

### 4. Task Execution Flow

For every task:

1. Read the task from `tasks.md`
2. Select the relevant skill(s)
3. Explain briefly what will be done
4. Implement the task
5. Show:

   * files created/modified
   * key code snippets
6. Stop

---

### 5. Code Quality

* Follow existing project structure
* Do NOT break existing code
* Keep code modular and clean
* Add validation where needed
* Handle edge cases

---

### 6. Image Handling Rules

* Images must be uploaded as files (NOT URLs)
* Maximum 4 images per product
* Deleting an image must:

  * remove database record
  * delete the physical file

---

### 7. Variants Logic

* If a product has variants:

  * product-level price/stock MUST NOT be used
* Each variant must have:

  * name
  * price
  * stock

---

### 8. Linked Products

* Must support many-to-many relationships
* Must allow adding/removing links
* Must not create duplicates

---

## Output Format

For every task:

* Task name
* Skills used
* What was implemented
* Files changed
* Code snippets (only relevant parts)

Then STOP.
