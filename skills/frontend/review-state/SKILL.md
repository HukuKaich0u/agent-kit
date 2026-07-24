---
name: frontend-review-state
description: Use when reviewing state management architecture — classifying state types (server/URL/form/UI), checking for over-globalization, Jotai/Zustand/Redux patterns, derived state, and logout/cache invalidation.
---

# Frontend Review — State Management

You are performing a frontend state-management architecture review. This is a **read-only desk review** you run manually against a repo — there is no bundled audit script or scheduled cadence. The most common AI-generated problems are: putting everything in global state, storing server data in a global store instead of a dedicated data-fetching layer, and using coarse-grained selectors that cause the whole component tree to re-render.

## Procedure

1. Read `package.json` to identify the state management libraries already in use, and detect any existing framework conventions (e.g. a Next.js app using Server Components / Server Actions for data that another stack would put in a client cache). Use `rg` / `git grep` directly; there is no bundled audit script.
2. Grep for global state usage patterns:
   ```bash
   # Jotai
   rg "atom|useAtom|useAtomValue" src/ --include='*.ts' --include='*.tsx' -c
   # Zustand
   rg "create\b|useStore\b" src/ --include='*.ts' --include='*.tsx' -l
   # Redux
   rg "createSlice|useSelector|useDispatch" src/ --include='*.ts' --include='*.tsx' -l
   # Context
   rg "createContext|useContext" src/ --include='*.ts' --include='*.tsx' -l
   ```
3. Sample 3–5 of the largest atom / store definitions and assess what they contain.
4. Check for server state stored in global store (should go through whatever the project's data-fetching layer is — TanStack Query, SWR, RTK Query, or framework-native fetching — not a hand-rolled global).
5. Check for URL state stored in global store (should be `useSearchParams` / a URL-state library, or the framework's routing primitives).
6. Check for form state stored in global store (should be handled by a form library or local component state, per whatever the project already uses).

## State Classification

Correctly classify state by type. Each type is best served by a dedicated tool — mixing them into one general-purpose global store is the root cause of most state management bugs. The specific library matters less than the classification; defer to whatever the project's existing framework/library conventions already are, and don't push a different library as "the fix" when a same-category swap would do.

```
Server state   → dedicated data-fetching/cache layer   (not a hand-rolled global store)
                 e.g. TanStack Query, SWR, RTK Query, or framework-native fetching (Next.js Server Components/Actions, Remix loaders)
URL state      → routing/URL-state primitives           (not global store)
                 e.g. useSearchParams, nuqs, or the framework's router
Form state     → form library or local component state  (not global store)
                 e.g. React Hook Form, Formik, or the project's existing convention
UI local       → useState / useReducer                  (component-scoped)
UI global      → Jotai / Zustand / Redux / Context       (minimum scope, whatever the project already uses)
```

Flag server, URL, or form state found in a general-purpose global store (Jotai/Zustand/Redux/Context) as a likely design mistake — the concern is the category mismatch (duplicated source of truth, missed cache invalidation, missed URL sync), not that a specific library wasn't chosen. Report the mismatch with concrete evidence (duplicated state, sync bugs, stale reads) rather than flagging on library choice alone.

## Library-Specific Checks

Apply the checks below only for libraries actually present in the project. These are examples of common per-library pitfalls, not a mandate to introduce a library the project doesn't already use.

### Jotai

- **Atom granularity**: one atom per logical unit; no large object atoms (`{ user, theme, notifications, ... }`).
- **Derived state**: use `atom(get => ...)` for computed values instead of storing redundant computed data.
- **Side effects**: isolate in `atomEffect` / `useAtomEffect`, not in `atom` setter callbacks.
- **Testability**: atoms declared at module top-level become global singletons — use `Provider` scoping in tests / Storybook.

```ts
// Bad: monolithic atom
const appStateAtom = atom({ user: null, theme: 'light', selectedItems: [], filterQuery: '' });

// Good: split + derived
const userAtom = atom<User | null>(null);
const themeAtom = atom<'light' | 'dark'>('light');
const filteredItemsAtom = atom((get) =>
  get(allItemsAtom).filter(item => item.name.includes(get(filterQueryAtom)))
);
```

### Zustand

- **Selector usage**: `useStore(state => state.specificField)` — never subscribe to the entire store object.
- **Shallow compare**: use `shallow` from `zustand/shallow` when selecting multiple fields as an object.
- **No direct mutation**: always use `set` / `get`, never mutate state outside of Zustand's setter.

```ts
// Bad: subscribes to everything
const { user, theme, cart } = useStore();

// Good: selector per field (or shallow for multi-field)
const user = useStore(state => state.user);
const { theme, cart } = useStore(useShallow(state => ({ theme: state.theme, cart: state.cart })));
```

### Redux Toolkit

- Is `createSlice` used (not hand-written reducers)?
- Is async data fetched via `createAsyncThunk` or RTK Query, not manual `dispatch` chains?
- Is server state in RTK Query / TanStack Query rather than a slice?

### Context API

- Context re-renders every Consumer when any value changes. If the context value is an object, split it into separate contexts per logical group (e.g., `AuthContext`, `ThemeContext`).
- Context is suitable for stable, low-frequency values (auth user, theme, i18n locale).
- Do not use Context as a general-purpose state manager for high-frequency updates.

## Logout & Cache Invalidation

A common bug: after logout, the next user who logs in sees cached data from the previous session.

Check that the logout handler:
1. Calls the server logout endpoint (session revocation)
2. Clears the server-state cache layer in use (e.g. `queryClient.clear()` for TanStack Query, or the equivalent for SWR/RTK Query/framework cache)
3. Resets all auth-related global state (Jotai atoms, Zustand stores, Context, or whatever the project uses)
4. Navigates to `/login` (after clearing, not before)

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/state-review.md`) with:

- **State inventory**: which libraries/patterns are used, rough count of atoms/stores/contexts
- **Misclassified state**: server/URL/form state found in a general-purpose global store, with concrete evidence (duplicated source of truth, sync bugs, stale reads)
- **Anti-patterns found**: with file:line references
- **Logout/cache gap** if found
- **Recommended PRs**: each scoped to one logical refactor, consistent with the project's existing library choices
- **Issues to file** — draft titles + bodies. If the repo has an issue tracker configured (see `docs/agents/issue-tracker.md` from `setup-agent-kit`), follow that workflow; otherwise present the drafts for the human to file.

Keep under 200 lines. File-level details stay in the raw search output, not in the report.

Do NOT create issues or run `gh issue create` yourself — present the drafts for the human.

## Boundaries

- Do NOT rewrite state management code. The report identifies gaps; engineering implements fixes.
- Do NOT touch source files in the client repo.
- These checks are judgement calls, not absolute rules. No single state library is the "correct" answer — weigh findings against the project's existing conventions and report category mismatches (wrong kind of tool) rather than library-choice preferences.
- Rendering performance (re-renders, memo usage) is covered by `frontend-review-performance`.

## Reference

- TanStack Query: https://tanstack.com/query/latest
- Zustand: https://zustand.docs.pmnd.rs/
- Jotai: https://jotai.org/
- Related: `frontend-review-performance` (re-render profiling)
