# Responsive Design Guidelines

This document outlines the responsive design standards and practices for the SideCommerce storefront to prevent layout regressions.

---

## Viewport & Meta Tags

### Critical HTML Meta Tag
Ensure this is in the root layout `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
```

- `width=device-width`: Match device width
- `initial-scale=1.0`: Start at 100% zoom
- `maximum-scale=1.0`: Prevent user zoom (UX choice for store)
- `user-scalable=0`: Disable pinch zoom

---

## CSS Containment Rules

### 1. **No Horizontal Overflow**
All containers must respect viewport width:
```css
html, body {
  width: 100%;
  overflow-x: hidden;
}

.container {
  max-width: 100% !important;
  padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem));
  padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem));
}
```

### 2. **Image Scaling**
All images must scale with viewport:
```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}

.product-card-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  display: block;
}
```

### 3. **Scrollable Elements**
Any element with `overflow-x: auto` must have:
```css
.scrollable-row {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;  /* iOS momentum scrolling */
  max-width: 100%;
  scrollbar-width: thin;
}
```

### 4. **Fixed Position Elements**
Limit use of `position: fixed`:
- Use sparingly and only for critical UI (modals, filter panels)
- Always include `max-width: 100%` and `width: 100%`
- Account for safe area insets:
```css
.fixed-panel {
  position: fixed;
  inset: 0;  /* or specific values */
  width: 100%;
  max-width: 100%;
  padding: 1rem;
  padding-left: max(1rem, env(safe-area-inset-left, 1rem));
  padding-right: max(1rem, env(safe-area-inset-right, 1rem));
}
```

---

## Safe Area Insets (iOS Notch Support)

Always account for notched devices:
```css
@supports (padding: max(0px)) {
  .element-with-safe-area {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1rem, env(safe-area-inset-top));
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}
```

---

## Responsive Breakpoints

Bootstrap breakpoints followed:
- **Mobile**: < 576px (very small phones)
- **Mobile+**: 576px - 767.98px (standard phones)
- **Tablet**: 768px - 991.98px
- **Desktop**: ≥ 992px

### Media Query Pattern
```css
/* Mobile-first: base styles apply to mobile */
.component { /* mobile styles */ }

@media (min-width: 768px) {
  .component { /* tablet styles */ }
}

@media (min-width: 992px) {
  .component { /* desktop styles */ }
}
```

---

## Mobile-Specific Behaviors

### 1. **Scroll Locking**
When showing modals/filter panels, prevent background scroll:
```ts
// Use class-based approach instead of inline styles
document.body.classList.add("scroll-locked");

// CSS:
body.scroll-locked {
  position: fixed;
  width: 100%;
  overflow: hidden;
}
```

### 2. **Dynamic Viewport Height**
Mobile browsers hide/show address bar dynamically. Use `100dvh` (dynamic viewport height):
```css
html.scroll-locked,
html.scroll-locked body {
  height: 100vh;
  height: 100dvh;  /* Fallback for browsers without dvh support */
}
```

### 3. **Smooth Scrolling for Touch**
Enable momentum scrolling on iOS:
```css
-webkit-overflow-scrolling: touch;
```

---

## Component Checklist

When building new components, verify:

- [ ] Element has `max-width: 100%`
- [ ] Images use `max-width: 100%` and `height: auto`
- [ ] No child elements exceed parent width
- [ ] Long text wraps properly (no `white-space: nowrap` without truncation)
- [ ] Padding uses safe area insets where needed
- [ ] Touch targets are ≥ 44px on mobile
- [ ] Tested on iPhone Safari, Android Chrome
- [ ] No `position: fixed` without proper viewport handling
- [ ] Animations use transforms (GPU-accelerated) not layout properties
- [ ] z-index values don't conflict (use defined scale: 1-1999)

---

## Testing Checklist

Before deploying, test:

### Mobile (iOS Safari)
- [ ] No horizontal scroll at any zoom level
- [ ] Scrolling feels smooth (no jank)
- [ ] Filter panel opens/closes smoothly
- [ ] No layout shifts during scroll
- [ ] Images load and scale properly
- [ ] Touch interactions are responsive

### Mobile (Android Chrome)
- [ ] Same as iOS checks
- [ ] Notch/cutout safe area respected
- [ ] No viewport zoom on input focus

### Tablet
- [ ] 2-column grid displays correctly
- [ ] Filter panel as sidebar on landscape
- [ ] Touch interactions work at scale

### Desktop
- [ ] 4-column grid displays correctly
- [ ] Filter panel slides in from right
- [ ] Hover effects work properly

---

## Common Pitfalls to Avoid

1. **Fixed widths on containers**
   ```css
   /* ❌ BAD */
   .container { width: 320px; }

   /* ✅ GOOD */
   .container { max-width: 100%; width: 100%; }
   ```

2. **Overflow without max-width**
   ```css
   /* ❌ BAD */
   .scrollable-row { overflow-x: auto; }

   /* ✅ GOOD */
   .scrollable-row { overflow-x: auto; max-width: 100%; }
   ```

3. **Large transforms causing overflow**
   ```css
   /* ❌ BAD */
   .modal { transform: translateX(0); /* full screen width */ }

   /* ✅ GOOD */
   .modal { width: 100%; max-width: 100%; transform: translateX(0); }
   ```

4. **Forgetting safe area insets on fixed elements**
   ```css
   /* ❌ BAD */
   .fixed-panel { position: fixed; padding: 1rem; }

   /* ✅ GOOD */
   .fixed-panel {
     position: fixed;
     padding: 1rem;
     padding-left: max(1rem, env(safe-area-inset-left));
   }
   ```

5. **Using vh without accounting for address bar**
   ```css
   /* ❌ BAD */
   .hero { height: 100vh; }  /* Might overflow on mobile */

   /* ✅ GOOD */
   .hero {
     height: 100vh;
     height: 100dvh;  /* Use dynamic viewport height */
   }
   ```

---

## Performance Notes

- Use `will-change` sparingly (only for animated elements)
- Prefer `transform` and `opacity` over `top`, `left`, `width` changes
- Avoid heavy reflows during scroll (no layout recalculations in scroll handlers)
- Use `-webkit-overflow-scrolling: touch` for iOS but test performance
- Debounce resize listeners if used

---

## Resources

- [MDN: Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [CSS: env() Function](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [Web.dev: Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [iOS Safari Documentation](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html)

---

## Last Updated
April 3, 2026

