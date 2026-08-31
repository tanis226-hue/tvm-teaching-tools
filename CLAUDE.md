@AGENTS.md

# Project rules

## The math is locked, not negotiable

`lib/retirement.ts` and `lib/mortgage.ts` reproduce published worked examples. If a
golden test fails, the implementation is wrong, not the test. Never edit an expected
value to make a test pass without recomputing the source figure first and saying so.

- Returns are **APR/12** (`rate / 12`). Inflation and every growth series are
  **geometric monthly** (`(1 + rate)**(1/12) - 1`). Mixing them changes published answers.
- **Inflation is 2.5%**, not 3%. It was moved on 2026-08-30 and that re-based every
  Module 1 figure. The worked example is $15,190 / $3,281,473 / $531.
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

## Deploying

Stop the dev server before `netlify deploy`. A running `next dev` holds files in
`.next` open on Windows and the Netlify Next adapter fails in `onPostBuild` with
"Failed publishing static content", which names neither the cause nor a file.
`rm -rf .next` first if a deploy has already failed.

## Module 2 rules

- **Never charge maintenance, insurance, HOA or renters insurance against `homeValue[t]`.**
  They are year-1 dollar costs grown at inflation. Charging them on an appreciating value
  made higher appreciation *reduce* the buyer's net worth and billed $108,489/yr to
  maintain a house worth ~$650k to rebuild. About 40% of a home's value is land. There is a
  test asserting lifetime upkeep is identical at 3.75% and 8% appreciation; do not weaken it.
- **Property tax is the only cost that may touch `homeValue[t]`.** Florida additionally
  models the homestead exemptions and the Save Our Homes cap, so its effective rate falls
  from 1.31% to 0.73% over 50 years.
- Rates are **spreads over inflation**, not free-floating constants: appreciation =
  inflation + 1.25pp, rent growth = appreciation - 0.5pp. Free constants are how the
  original bug got in.
- **The Fort Myers preset does not break even, on purpose.** It is sourced, not broken. If
  a change makes it break even, something got optimistic; check what.
- PMI rides the **original loan amount** and terminates at 78% LTV of the **original price**.
- The 15-year term must carry its own rate (5.98%), not the 30-year rate.

- The money-gone series must derive from `buyerOutlay - principal`, never from a
  re-derivation of the carrying costs. Re-deriving it is what silently dropped HOA.
- Plot cumulative **principal**, not `equity`, as the retained series. Equity includes
  appreciation the buyer never paid for and makes the chart contradict the headline.
- PMI terminates against the **original** price at 78% LTV, gated on `downPct < 0.2`.
  Never against the appreciated value.
- Any sentence about who is ahead must branch on the sign of the gap. `Math.abs` plus a
  hardcoded "behind" shipped a claim that was wrong in 110 of 521 slider positions.
- Labels that name a horizon must interpolate `input.termYears`, not hardcode 30.

## Neon

`lib/db.ts` initializes the client lazily so the app builds and Module 2 runs without
`DATABASE_URL`. Keep it that way. Postgres `numeric` comes back as a **string**, so
always `Number(...)` before arithmetic on submission columns.

For one-off SQL use `sql.query(text)`; the bare tagged template only accepts template
literals.

## Branding

FSW = Florida SouthWestern State College. Brand colors are FSW Purple `#470a68`
and Aqua `#00bfaa`, published on fsw.edu. They live as `--color-brand*` and
`--color-accent*` in `app/globals.css`; use the `brand`/`accent` Tailwind
utilities, never raw `slate-900`, for primary actions and active states.

The header mark is a lettermark, not FSW's official seal. Their licensing page
restricts the trademarked logo to marketing-approved licensees, so do not
scrape and embed it. If the college supplies an approved asset, drop it in
`public/` and swap it into `components/SiteHeader.tsx`.

Do not confuse FSW with FGCU. Two `FGCU RERI` citations in `lib/mortgage.ts`
and the README are correct: that is Florida Gulf Coast University's Regional
Economic Research Institute, the source for the Lee County price figure, and a
different institution from the one that teaches this course.

## Student access

`/retirement` and `/rentbuy` must stay reachable with no session code, no
sign-in, and no database. Both build as static pages; keep them that way.
`components/RetirementCalculator.tsx` is shared by `/retirement` (practice) and
`/s/[code]` (in class) so the numbers a student sees at home cannot drift from
the lecture. Add features to the component, not to one route.

## Recharts layout

Recharts anchors the legend wrapper AT `margin.top` (or bottom), so the legend
and an `insideBottom` axis label move together and no margin value separates
them. The working combination is `verticalAlign="top"` plus
`wrapperStyle={{ top: 0 }}` for the legend, and `position="bottom"` for the
x-axis label. Verify by measuring `getBoundingClientRect()` overlap between
every `<text>` pair, not by eye.
