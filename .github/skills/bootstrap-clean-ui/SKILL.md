---
name: bootstrap-clean-ui
description: "Use when: building or restyling pages/components with Bootstrap, cleaning UI layout, navbar/forms/cards/buttons, or keeping SideCommerce visual style consistent and modern."
---

# Bootstrap Clean UI Skill

Use this skill whenever editing UI in this repository.

## Design Direction
- Framework: Bootstrap.
- Style: clean, modern, compact.
- Palette: mostly neutral (`light`, `secondary`, `dark`, `danger` for destructive actions).
- Effects: minimal shadows and clear borders.

## Component Patterns
- Layout: `container` + `row` + `col-*`.
- Sections: `card shadow-sm border-0` for primary content.
- Forms: `form-control` / `form-control-lg` + `btn btn-dark`.
- Feedback: `alert alert-success` and `alert alert-danger`.
- Navigation: simple sticky top bar with clear active state and visible account icon/button.

## Consistency Rules
- Reuse shared CSS only for tiny app-specific helpers.
- Prefer Bootstrap classes over custom CSS unless there is a concrete gap.
- Keep spacing rhythm consistent (`mt-*`, `mb-*`, `py-*`, `gap-*`).
- Ensure desktop and mobile readability.

## Do Not
- Reintroduce Tailwind classes or config unless explicitly requested.
- Mix multiple visual systems in one component.
- Add heavy visual complexity for simple forms/settings flows.
