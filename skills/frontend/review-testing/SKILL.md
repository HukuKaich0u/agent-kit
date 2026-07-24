---
name: frontend-review-testing
description: Use when auditing test infrastructure — test runner setup and coverage, E2E configuration, VRT setup, coverage merging. Read-only desk review; run it manually per repo.
---

# Frontend Review — Testing

You are auditing the testing posture of a frontend project. This is a **read-only desk review** you run manually against a repo — there is no batch runner or scheduled cadence. Keep in mind:

- **E2E scope**: prioritize the highest-risk / highest-traffic user journeys and anything with a history of regressions — not exhaustive coverage of every route or controller branch.
- **Unit scope**: component coverage is prioritized, but weigh it against actual change risk rather than a fixed ratio.
- **Coverage merge**: if both a unit runner and an E2E runner produce V8 coverage, note whether they're combined (e.g. via `monocart-coverage-reports` or `istanbul-merge`) — but don't require it.

## Procedure

1. **Detect the stack first.** There is no bundled audit script — read the repo directly. Check `package.json` for the test runner (vitest, jest, etc.), E2E tool (playwright, cypress, etc.), and package manager, so the checks below map to what's actually installed.
2. Inspect:
   - `vitest.config.*` / `jest.config.*` (or equivalent) — is coverage configured? which provider?
   - `playwright.config.*` / `cypress.config.*` (or equivalent) — projects, webServer, sharding
   - `tests/`, `e2e/`, `__tests__/` — current test count and shape
   - `package.json` scripts — `test`, `test:coverage`, `test:e2e`
   - If a coverage summary already exists (e.g. `coverage/coverage-summary.json`), read it; otherwise note that coverage numbers are unavailable without running the suite.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/testing-review.md`) with:

- **Current state**: which runner(s) configured? how many tests? coverage % if available
- **Gaps**: missing config, missing scripts, no coverage merge
- **Recommended PRs** (3-5 max): each with title, affected files, expected coverage delta
- **Priority test targets**: the user journeys / modules that most need first coverage, based on risk and past incidents — not a fixed branch-by-branch checklist

## Component Testing — Testing Library First

For React component tests, prefer `@testing-library/react` over testing internal implementation:

- **Query by role / label / text** (`getByRole`, `getByLabelText`, `getByText`) rather than by class name or component internals.
- **User interactions** via `@testing-library/user-event` — `userEvent.click`, `userEvent.type` — not direct DOM event dispatch.
- **Async assertions** via `waitFor` / `findBy*` for state updates after async operations.

```tsx
// Bad: testing implementation details
const wrapper = render(<LoginForm />);
wrapper.find('button.submit').simulate('click');
expect(wrapper.state('isLoading')).toBe(true);

// Good: testing observable behaviour
render(<LoginForm />);
await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
expect(await screen.findByText('Welcome')).toBeInTheDocument();
```

When `@testing-library/react` is absent from `package.json`, flag it as a gap and recommend adding it alongside `@testing-library/user-event` and `@testing-library/jest-dom` (or `@testing-library/vitest-dom`).

For atom / store tests, use the library's own test utilities (e.g. Jotai `createStore()`) rather than rendering a component — keep component tests and state logic tests separate.

## In-Source Testing Pattern (situational)

For logic-heavy `.ts` files in Vite projects, co-locating tests in the same file (via `if (import.meta.vitest)`) is an option worth noting, not a default to push onto every repo:

- AI agents read the source and the spec in one file context, improving generation accuracy.
- Pure functions stay close to their invariants.
- Production builds strip the test block via `"import.meta.vitest": "undefined"` define.

Only surface this as a recommendation if the project already leans this way (Vite-based, few existing separate-file conventions) or the user asks about test organization — don't flag a conventional separate-test-file layout as a gap.

## Test Failure Triage Protocol

When a test fails, the correct action is **not** to mechanically rewrite the test to pass. Prompt the human to decide:

1. **Spec changed** — the implementation is now correct; update the test.
2. **Implementation bug** — the test is correct; fix the implementation.
3. **Test was wrong** — the test never matched the intended spec; rewrite the test.

Document this triage in the output report. Flag any existing tests that appear to be "implementation echoes" (testing the exact internal path rather than observable behaviour) as candidates for case 3.

## MSW (Mock Service Worker) Principle

When the codebase fetches from external APIs, recommend MSW over jest-style module mocks:

- Mock only at the network boundary (`http.get`, `http.post` handlers).
- Keep the actual state management / component wiring intact — only the HTTP response is stubbed.
- Place shared handlers in `src/test-utils/handlers.ts` or equivalent.

This avoids tests that pass even when the integration contract breaks.

## Coverage Guidance

- Treat coverage percentages as a signal, not a target — a project-wide fixed threshold (e.g. "80% everywhere") tends to produce tests that pad the number rather than encode real specs. Judge coverage relative to the file's risk: pure lib/utility logic and code with a history of bugs deserve more scrutiny than generated or low-change-risk code.
- **Anti-goal**: Do NOT inflate tests to reach 100%. Prefer fewer tests that encode real specs over many tests that only enumerate implementation details.
- Generated UI components (e.g. shadcn/ui output) are typically coverage-exempt — confirm against the project's own convention if one exists.

## VRT Stability Tips

- Generate reference snapshots inside a **Linux container** (same OS as CI) to eliminate font-rendering and antialiasing differences between machines.
- Inject web fonts globally via a shared fixture rather than per-test — font unavailability causes pixel diff false positives.

## Boundaries

- Do NOT write actual test code — propose structure and counts only.
- Do NOT run the test suite (`vitest`, `playwright`, etc.) from this skill unless the user explicitly asks — this is a desk review of configuration and existing test shape, not a test-execution pass.
- Do NOT touch the client source code.
