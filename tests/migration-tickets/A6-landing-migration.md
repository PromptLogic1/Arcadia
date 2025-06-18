# Agent A6: Landing/Marketing Test Migration

## Overview
Extract SEO, performance, and analytics logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/landing/seo.spec.ts`
- `/tests/landing/performance.spec.ts`
- `/tests/landing/analytics.spec.ts`
- `/tests/landing/marketing-conversion.spec.ts`
- `/tests/landing/homepage.spec.ts`
- `/tests/landing/responsive.spec.ts`

## Business Logic to Extract

### 1. SEO Metadata Generation (Unit Tests)
**From**: `seo.spec.ts`, `seo-meta.spec.ts`
**Extract to**: `src/features/landing/test/unit/seo-metadata.test.ts`
- Meta tag generation logic
- Open Graph data formatting
- JSON-LD structure generation
- Sitemap generation logic
- Canonical URL logic

### 2. Analytics Event Tracking (Unit Tests)
**From**: `analytics.spec.ts`
**Extract to**: `src/features/landing/test/unit/analytics.test.ts`
- Event payload formatting
- User property tracking
- Conversion event logic
- Page view tracking
- Custom event validation

### 3. Performance Budget Validation (Unit Tests)
**From**: `performance.spec.ts`
**Extract to**: `src/features/landing/test/unit/performance-budget.test.ts`
- Bundle size calculations
- Asset optimization rules
- Critical CSS extraction
- Lazy loading logic
- Resource hint generation

### 4. Conversion Tracking (Unit Tests)
**From**: `marketing-conversion.spec.ts`
**Extract to**: `src/features/landing/test/unit/conversion-tracking.test.ts`
- Funnel step detection
- A/B test variant assignment
- Goal completion logic
- Attribution tracking
- UTM parameter handling

### 5. Responsive Layout Logic (Unit Tests)
**From**: `responsive.spec.ts`
**Extract to**: `src/features/landing/test/unit/responsive-layout.test.ts`
- Breakpoint calculations
- Component visibility rules
- Image srcset generation
- Touch target sizing
- Viewport calculations

## Test Structure to Create

```
src/features/landing/test/
├── unit/
│   ├── seo-metadata.test.ts
│   ├── analytics.test.ts
│   ├── performance-budget.test.ts
│   ├── conversion-tracking.test.ts
│   ├── responsive-layout.test.ts
│   └── components/
│       ├── carousel.test.ts
│       └── hero-section.test.ts
└── integration/
    ├── page-metadata.test.ts
    ├── analytics-pipeline.test.ts
    └── performance-metrics.test.ts
```

## Implementation Steps

1. **Extract SEO logic**
   - Test metadata generation
   - Test structured data
   - Test URL generation
2. **Extract analytics logic**
   - Test event formatting
   - Test property tracking
   - Test validation rules
3. **Extract performance logic**
   - Test budget calculations
   - Test optimization rules
   - Test resource hints
4. **Extract conversion logic**
   - Test funnel detection
   - Test variant assignment
   - Test goal tracking
5. **Update E2E tests**
   - Keep visual regression tests
   - Test critical user paths
   - Remove logic testing

## E2E Tests to Keep (Simplified)
- Homepage loads and displays content
- Navigation works across pages
- CTA buttons are clickable
- Page is responsive on mobile
- Analytics events fire on interaction

## Success Criteria
- SEO logic fully unit tested
- Analytics logic tested in isolation
- Performance budgets have automated tests
- E2E tests reduced by 70% in size
- Marketing logic is predictable

## Priority: LOW
Important for growth but not core functionality.