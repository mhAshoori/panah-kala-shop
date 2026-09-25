# Specification Quality Checklist: Admin Discount Method Selection

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-25
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Scope boundary**: this feature replaces the input affordance introduced by
  004-product-required-discount. It does not change the stored representation
  (selling price + original price pair), the rounding direction, the 100 Toman
  percentage floor, or the badge honesty guarantee, all of which carry forward.
- **Deliberately not asked**: the method-control visual form (a segmented
  control vs. a radio group vs. a select) is an implementation detail of the
  existing component set, not a scope question. The spec states the behavioural
  requirement (FR-002) — mutually exclusive, exactly one selected, visibly a
  single control.
- **Deliberately not asked**: whether a per-row method choice should be
  remembered between sessions. Defaulted in Assumptions — the method is not
  stored, so it is re-derived from the stored pair on load. Storing it would add
  a column to carry information that is fully derivable, which is outside what
  this feature needs.
- **Deliberately not asked**: wording of new labels and messages. Copy is a
  follow-on detail; the spec fixes the requirement (bilingual parity, FR-025)
  without dictating text.
- **No [NEEDS CLARIFICATION] markers were raised.** Every open point had a
  defensible default derived from feature 004's established behaviour, and each
  default is recorded in Assumptions so it can be revisited at plan time.
- **Contradiction check**: the 1 percent warning (FR-018) and the badge honesty
  guarantee (FR-008, FR-022) were checked against each other. A sub-1% discount
  is admitted with a warning and stores an identical pair, which yields no badge
  at all — so the guarantee is satisfied by the pair being unremarkable, not by a
  refusal. The two requirements are complementary, not in conflict.
