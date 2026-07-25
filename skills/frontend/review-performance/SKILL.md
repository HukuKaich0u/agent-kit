---
name: frontend-review-performance
description: Use when reviewing React rendering performance — profiler-first diagnosis, memo/useCallback/useMemo correctness, virtual scroll, useTransition/useDeferredValue, and canvas/WebGL separation for data-heavy UIs.
---

# Frontend Review — Rendering Performance

You are performing a frontend rendering-performance review. This is a **read-only desk review** you run manually against a repo — there is no bundled audit script or scheduled cadence. The most common AI-generated problems are: applying `memo` / `useCallback` / `useMemo` everywhere without measuring (or never at all), missing virtual scroll on large lists, and Context changes re-rendering unrelated components.

## Procedure

1. Detect the stack first: React version (check for React Compiler / `babel-plugin-react-compiler` in `package.json` — it auto-memoizes and changes what's worth flagging), and any performance-related packages already in use (`@tanstack/react-virtual`, `react-window`, `@welldone-software/why-did-you-render`, etc.). Use `rg` / `git grep` directly; there is no bundled audit script.
2. Grep for existing memo usage:
   ```bash
   rg "React\.memo|useMemo|useCallback" src/ --include='*.tsx' --include='*.ts' -c
   rg "useVirtualizer|FixedSizeList|VariableSizeList" src/ --include='*.tsx' -c
   rg "useTransition|useDeferredValue|startTransition" src/ --include='*.tsx' -c
   ```
3. Find the largest list-rendering components (look for `.map(` on arrays with no size guard) and note actual list sizes where determinable — don't assume.
4. Look for Context providers that change frequently and might cause wide re-renders.
5. For map / chart / dashboard-style apps: check whether heavy rendering is in React state or in a canvas/WebGL ref.

## Profiler-First Principle

**Do not recommend memo / useCallback / useMemo without first profiling (or without concrete evidence in the code that a recommendation would help).** Premature memoization adds cognitive overhead and can slow things down (each hook has a cost). This applies less rigidly when React Compiler is in use — it handles most memoization automatically, so manual `memo`/`useCallback`/`useMemo` becomes largely redundant and a review should flag *unnecessary* manual memoization rather than its absence.

When writing the report, prefix every optimization recommendation with: "After profiling confirms X re-renders per interaction, consider Y." Whether manual memoization is even the right lever depends on the React version, whether React Compiler is present, and the actual DOM/render complexity — treat these as judgement calls, not a fixed rule to apply uniformly.

## Memoization Correctness

When memoization IS present (or being recommended), check for these common mistakes. Note: inline callbacks and the absence of manual `memo`/`useMemo`/`useCallback` are not inherently wrong — they're only a problem when profiling or render-count evidence shows they cause a measurable re-render cost. Judge each case against actual evidence, not a blanket rule.

### React.memo

- Is `React.memo` applied to components that receive stable props from their parents?
- Is the parent passing **new object/array/function references** on every render (negating memo)?

```tsx
// Bad: new array on every render — memo is useless
<List items={data.filter(x => x.active)} />

// Good: stable reference with useMemo
const activeItems = useMemo(() => data.filter(x => x.active), [data]);
<List items={activeItems} />
```

### useCallback

- Is `useCallback` used when passing callbacks to `memo`-wrapped children?
- Are dependency arrays accurate (no missing or unnecessary deps)?

```tsx
// Bad: new function reference every render
<Button onClick={() => handleDelete(id)} />

// Good: stable reference
const handleDeleteClick = useCallback(() => handleDelete(id), [id, handleDelete]);
<Button onClick={handleDeleteClick} />
```

### useMemo

- Is `useMemo` applied to **expensive** computations (filter/sort/aggregate on large arrays), not trivial ones (string concat, boolean check)?
- Are dependency arrays correct?

## Virtual Scroll

Virtual scroll becomes worth the added complexity once a list's actual (or realistic max) size and per-row render cost start causing dropped frames or slow initial paint — there is no fixed item-count threshold. A 100-item list of simple text rows may be fine unvirtualized; a 50-item list of heavy cards with images may not be. Check actual/expected data volume and row complexity rather than applying a single number.

Recommended (when virtualization is warranted): `@tanstack/react-virtual` (works with any layout, no CSS constraints) — but defer to the project's existing choice (e.g. `react-window`) if one is already in use.

```tsx
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
});

return (
  <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map(vItem => (
        <div key={vItem.key} style={{ position: 'absolute', top: vItem.start, height: vItem.size }}>
          <ListItem item={items[vItem.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

Flag lists whose size and row complexity make an unvirtualized render a plausible performance problem — cite the concrete evidence (item count, row weight) rather than a threshold rule.

## Concurrent Features (React 18+)

- **`useTransition`** — wrap heavy non-urgent state updates so the UI stays responsive:

```tsx
const [isPending, startTransition] = useTransition();
const handleFilterChange = (q: string) => {
  startTransition(() => setFilterQuery(q));
};
```

- **`useDeferredValue`** — defer a value that drives expensive rendering:

```tsx
const deferredQuery = useDeferredValue(filterQuery);
const filtered = useMemo(() => items.filter(i => i.name.includes(deferredQuery)), [deferredQuery, items]);
```

Flag heavy filter/sort operations that block the main thread on every keystroke — these are candidates for `useTransition`.

## Canvas / WebGL Separation (iot-ops / map / chart apps)

For data-dense UIs (real-time dashboards, map overlays, charting), React state is the wrong tool for per-frame updates.

Check whether:
- High-frequency data (sensor readings, map tile updates, chart data) bypasses React state and goes directly to canvas/WebGL via `useRef`.
- React only controls the layout shell and control panel; the canvas/WebGL layer handles rendering independently.

```ts
// Pattern: React controls mount; canvas reads data via ref
const canvasRef = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  const renderer = new WebGLRenderer(canvasRef.current!);
  const unsub = sensorStream.subscribe(data => renderer.update(data)); // no setState
  return unsub;
}, []);
```

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/performance-review.md`) with:

- **Stack detected**: React version, React Compiler presence, existing perf tooling
- **Profiling recommendation**: what to measure first and how (React DevTools Profiler, why-did-you-render)
- **Memoization gaps / misuse**: file:line references for each finding, with reasoning (not just "missing memo")
- **Virtual scroll candidates**: component name, actual/estimated list size, row complexity
- **Concurrent feature opportunities**: interactions that block the thread
- **Canvas/WebGL assessment** (if applicable): is high-frequency data bypassing React state?
- **Recommended PRs**: one optimization per PR, profiling benchmark in PR description
- **Issues to file** — draft titles + bodies. If the repo has an issue tracker configured (see `docs/agents/issue-tracker.md` from `setup-agent-environment`), follow that workflow; otherwise present the drafts for the human to file.

Keep under 200 lines. Recommendations without profiling evidence must be explicitly flagged as "unconfirmed — profile first."

Do NOT create issues or run `gh issue create` yourself — present the drafts for the human.

## Boundaries

- Do NOT run profiling sessions — describe what to measure and how.
- Do NOT propose optimization without a measurement plan.
- Do NOT touch source files in the client repo.
- These checks are judgement calls, not absolute rules. Fixed item-count thresholds, "always memoize," and "never use inline callbacks" all ignore React version, compiler presence, and actual measured cost — weigh recommendations against the real stack and profiling evidence.
- State management architecture (store design, selector granularity) is covered by `frontend-review-state`.

