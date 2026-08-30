@AGENTS.md

# Project rules

## The math is locked, not negotiable

`lib/retirement.ts` and `lib/mortgage.ts` reproduce published worked examples. If a
golden test fails, the implementation is wrong, not the test. Never edit an expected
value to make a test pass without recomputing the source figure first and saying so.

- Returns are **APR/12** (`rate / 12`). Inflation and every 3%/yr growth series are
  **geometric monthly** (`(1.03)**(1/12) - 1`). Mixing them changes published answers.
- Estate residual is **nominal**: 10% of lump sum `L` at age 85.
- Contributions and withdrawals grow geometrically **every month**, never in annual steps.

## Recharts 3

**Always set `isAnimationActive={false}` on every `Area`, `Line`, `Bar`, and `Scatter`.**
Without it, mount animations can leave marks stuck at their zero state: bars render at
5px, scatter dots at 3px, and the chart looks empty while the DOM says the elements
exist. This cost real debugging time. It is also correct behavior for a slider-driven
projector tool, which wants instant redraw.

Tooltip formatters must take `unknown`, not `number`. Recharts 3 types the value as
`ValueType | undefined` and a `(v: number) => string` formatter will not typecheck.

Prefer explicit numeric `domain={[min, max]}` over the `'dataMin - 2'` string form.

## Next 16

- The route-segment options `dynamic`, `revalidate`, `fetchCache`, `dynamicParams` and
  `runtime` **still exist** in 16.3.3 (verified in
  `node_modules/next/dist/build/segment-config/app/app-segment-config.js`). They are
  removed only when Cache Components is enabled, which `next.config.ts` does not do.
  This project simply does not need them: route handlers are resolved per request and
  `.next/prerender-manifest.json` contains no API route. `runtime = 'edge'` is separately
  deprecated. Do not add them back, but do not claim they are unavailable either.
- Route and page `params` are Promises: `{ params }: { params: Promise<{ code: string }> }`,
  unwrapped with `await` on the server and `use()` in client components.
- Read `node_modules/next/dist/docs/` before assuming an API. It differs from training data.

## Styling

Do not reintroduce a `prefers-color-scheme` block in `app/globals.css`. The
create-next-app default shipped an unlayered `body { background: var(--background) }`
rule that **beats Tailwind's layered utilities**, which turned the page black for any
student whose phone was in dark mode. This tool is projected and scanned on thirty
different phones; it must look identical on all of them.

Module 1 is mobile-first (375px). Module 2 is projector-first: large type, thick
sliders, readable from the back of a room.

## Display order

Module 1's results are fixed: inflated income, then lump sum, then monthly contribution.
The first two are supposed to be alarming so the third reads as relief. Do not reorder.

## Privacy

No names, no student IDs, no emails, no IP addresses, ever. The device hash identifies a
browser for dedupe only. If a change would add a personally identifying field, stop.

## Neon

`lib/db.ts` initializes the client lazily so the app builds and Module 2 runs without
`DATABASE_URL`. Keep it that way. Postgres `numeric` comes back as a **string**, so
always `Number(...)` before arithmetic on submission columns.

For one-off SQL use `sql.query(text)`; the bare tagged template only accepts template
literals.
