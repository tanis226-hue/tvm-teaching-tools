# Time Value of Money Teaching Tools — Design

**Course:** Business Mathematics (first-semester freshmen), FSW
**Last revised:** 2026-08-31
**Status:** Live at https://tvm-tools.netlify.app

This describes what the tool does now. The reasoning behind the three model
corrections that got it here is in the changelog at the end; those matter more
than most of the rest of this document, because each produced a visibly wrong
answer on screen before it was found.

---

## 1. What these are for

**Module 1, Retirement calculator.** Delivers three moments in a fixed order:

1. **The shrinking million.** $1M in 45 years is worth **$329,174** today.
2. **The cost of waiting.** Starting at 30 instead of 20 nearly doubles the
   required contribution: **$531 → $949** a month.
3. **The relief.** After two intimidating numbers, the monthly figure is smaller
   than students feared.

The order is enforced by the UI and must not change. The first two numbers are
supposed to alarm so the third reads as relief.

**Module 2, Rent vs buy.** Shows that buying is a bundle of financial mechanics
— amortisation, equity, payment lock-in, forced saving, transaction costs — not
an aesthetic decision. It surfaces a breakeven year and lets sliders move it. It
never declares a winner.

## 2. Access

Both modules are free, need no sign-in, and store nothing about a student.

| Route | Who | Needs a database? |
|---|---|---|
| `/retirement` | students, any time | no, static |
| `/rentbuy` | students and the projector | no, static |
| `/instructor` → `/s/[code]` → `/d/[code]` | in-class session | yes |

`components/RetirementCalculator.tsx` is shared by `/retirement` and
`/s/[code]`. The only difference is the submit step, so the figures a student
gets at home cannot drift from the lecture.

## 3. Shared assumptions

One config, `lib/assumptions.ts`, so the modules cannot drift apart.

```ts
INFLATION        = 0.025   // CPI-U realised 1996-2026 2.56%; SPF 10-yr 2.30%
RETURN_PRE       = 0.075   // accumulation, and the renter's investments
RETURN_POST      = 0.040   // during retirement; 1-yr Treasury 4.04%
MORTGAGE_RATE    = 0.0666  // Freddie Mac PMMS, 2026-08-27
MORTGAGE_RATE_15 = 0.0598  // same release
LIFE_EXPECTANCY  = 85
ESTATE_RESIDUAL  = 0.10    // nominal, of lump sum L
```

**Rate convention, non-negotiable.** Returns are APR/12. Inflation and every
growth series compound geometrically monthly. Mixing them changes published
answers.

Every screen shows its active assumptions, and both modules carry a "show the
formula" toggle.

## 4. Module 1: Retirement calculator

**Format:** mobile-first, reached by QR code in class.

### Inputs

| Input | Range | Default |
|---|---|---|
| Current age | 16–70 | 20 |
| Retirement age | 45–80 | 65 |
| Desired monthly income, today's dollars | $500–$50,000 | $5,000 |
| Employer match | 0 / 25 / 50 / 100% | 0% |

Everything else is locked, which is what makes the aggregated class data
comparable.

### Calculation

`i = 0.04/12`, `ip = 0.075/12`, `g = (1.025)^(1/12) − 1`, `N` months saving,
`n` months drawing down.

```
P    = income_today × 1.025^(retirement_age − current_age)
PV   = P / (i − g) × [1 − ((1+g)/(1+i))^n]
L    = PV / (1 − 0.10 / (1+i)^n)
FV   = [(1+ip)^N − (1+g)^N] / (ip − g)
PMT1 = L / FV
```

Contributions and withdrawals grow geometrically **every month**, never in
annual steps. The residual is **nominal**: 10% of `L` in nominal dollars at 85.

Guard the division by `(i − g)`. Locked rates make it safe today; editable rates
would divide by zero silently.

### Employer match

A **post-solve split, never an input to the solve.** The required total is
unchanged; the match only changes who pays it.

```
personal = PMT1 / (1 + match_rate)
employer = PMT1 − personal
```

| Match | You pay | Employer pays |
|---|---|---|
| 0% | $531 | $0 |
| 50% | $354 | $177 |
| 100% | $266 | $266 |

This keeps `PMT1` comparable across students so the class histogram stays
meaningful, and dodges the salary problem: a real match is "50% up to 6% of
salary" and there is no salary input. Label it on screen as a simplification.

### Golden values

Age 20, retire 65, $5,000/mo. Tolerance 0.5%.

| Output | Value |
|---|---|
| First monthly withdrawal at 65 | $15,190 |
| Lump sum needed | $3,281,473 |
| First monthly contribution | $531 |
| Final monthly contribution | $1,611 |
| Total contributed | $525,616 |

Cost of waiting: 20 → $531, 25 → $706, 30 → $949, 35 → $1,296, 40 → $1,813.

### Class aggregation

Session-scoped, anonymous by design. Captured: three inputs, match rate, three
computed outputs. Never captured: names, student IDs, emails, IP addresses.

The submit route **recomputes server-side** rather than trusting client output —
the route runs in Node and imports the solver directly, so this costs one
function call, not a duplicated implementation.

Results are readable by session code without the instructor token: the code is
already public on the projector and the data is anonymous by construction. The
token gates only session closure, the single destructive action.

Data is deleted after seven days. Starting a session purges every session past
the window, deletion cascades to submissions, and `getSession` filters on the
same window so an expired code 404s between purges. The purge rides on session
creation, so there is no cron to run and an idle database stops growing.

The dashboard polls every 8s, pauses while hidden, and stops after three hours.
That cap is not cosmetic: Neon's free tier is 100 CU-hours a month, and a
forgotten projector tab exhausts it in about two weeks, which suspends the
database and takes Module 1 down until the next billing period.

## 5. Module 2: Rent vs buy

**Format:** projector-first, instructor-driven. No poll, no database.

### Presets

**National opens the lesson** because it breaks even and gives the class a
working baseline. **Fort Myers is the second act**, and with sourced Lee County
numbers it never breaks even. That contrast is the lesson.

| Input | National | Fort Myers | Base |
|---|---|---|---|
| Home price | $400,000 | $385,000 | purchase price |
| Down payment | 10% (3.5 / 5 / 10 / 20 presets) | same | NAR 2025 median first-time buyer |
| Rate | 6.66%, 15-yr toggle carries 5.98% | same | Freddie Mac PMMS |
| Closing to buy / sell | 2% / 7.0% | 2% / 6.7% | sale applies to the appreciated price |
| Property tax | flat 1.00% of market value | Florida homestead + Save Our Homes | see below |
| **Maintenance** | **$4,100/yr** | **$4,200/yr** | **dollars, inflating** |
| **Insurance** | **$2,000/yr** | **$3,576/yr** | **dollars, inflating** |
| **Flood** | $0 (off) | $1,975/yr | dollars, inflating |
| Appreciation | 3.75% | 3.75% | inflation + 1.25pp real |
| PMI | 0.38%/yr of the **original loan** | same | ends at 78% LTV of original price |
| Starting rent | $2,300/mo | $2,200/mo | Zillow ZORI SFR, 2026-07-31 |
| Rent increase | 3.25% | 3.25% | appreciation less 0.5pp |
| **Monthly budget** | **$3,300** | **$3,600** | **housing + saving, inflating** |
| Investment return | 7.5% gross | same | shared with Module 1 |
| **Breakeven** | **9.3 yr** | **never** | |

### The comparison

- **Month 0:** buyer pays down payment plus purchase closing costs. Renter
  invests that identical sum.
- **Each month:** buyer outlay is P&I + tax + upkeep + HOA + PMI. Renter outlay
  is rent + renters insurance.
- **Both live on the same budget** for housing plus saving, growing with
  inflation, and each invests `budget − its own outlay`. This is what keeps the
  renter's outcome independent of the buyer's costs.
- **Buyer net worth** = value − balance − selling costs + investments.
  **Renter net worth** = investments.
- **Breakeven** = first month buyer exceeds renter.

**Only property tax tracks market value.** Maintenance, insurance, HOA and
renters insurance are dollar costs growing at inflation. About 40 cents of every
dollar of a home's value is land, which needs no roof and no premium.

**Florida property tax** models the $25,000 homestead exemption, the CPI-indexed
second exemption, and the Save Our Homes cap on assessed growth. The effective
rate falls from **1.31% in year 1 to 0.73% by year 50**; a flat rate cannot
represent a 1.8× spread.

**Crossings.** In 3.7% of slider configurations the paths cross more than once,
so the result carries `crossings` and `settledAheadMonth`. The headline reports
where the buyer **stays** ahead and names four outcomes separately: never ahead,
cleanly ahead, ahead after several swaps, and ahead in the middle but behind at
the end.

**Horizon is 50 years.** The mortgage ends at 30 while rent keeps compounding,
and that divergence is the back half of the lesson.

### What Fort Myers says

With sourced 2026 inputs, buying in Lee County does not break even within 50
years — not at 20% down, not with flood excluded. The buyer pays $3,568/mo
against $2,230 of rent, a $1,338 gap sustained for 247 months, because Lee
County carrying costs are 3.84% of price per year. Price-to-rent is 14.6×,
mid-band for the market, so this is not an artefact of a bad rent figure.

This conflicts with the original PRD's 5–8 year design target. The resolution is
pedagogical, not numerical: National opens, Fort Myers is the contrast.

### Golden values

| | National | Fort Myers |
|---|---|---|
| Cash to close | $48,000 | $46,200 |
| P&I, flat | $2,313 | $2,227 |
| Breakeven | month 112 (9.3 yr) | none within 50 years |
| Total interest, 30 yr | $472,845 | $455,113 |
| Property tax, year 1 | $4,012 (1.00%, flat) | $5,030 (1.31%, falling to 0.73%) |
| PMI total | $12,540, ends month 110 | $12,070, ends month 110 |
| Household budget | $3,300/mo | $3,600/mo |
| Months over budget | 0 | 0 |
| Rent, year 50 | $11,352 | $10,858 |
| Buyer NW, year 50 | $10,009,412 | $10,289,640 |
| Renter NW, year 50 | $8,365,756 | $12,042,380 |

### Invariants the tests enforce

Values catch drift; these catch whole classes of bug, and they are what found
the last two:

- **C1.** Rates are spreads over inflation: appreciation = inflation + 1.25pp,
  rent growth = appreciation − 0.5pp. Free-floating constants are how the first
  bug got in.
- **C3.** Price-to-rent stays within 10–22×. Outside that, the UI warns that the
  combination has never existed in a real market.
- **C5.** Lifetime maintenance and insurance are **identical** at 3.75% and 8%
  appreciation. If they differ, upkeep has regressed onto market value.
- **C6.** Property tax is the only cost that touches `homeValue[t]`.
- **C9.** PMI rides the original loan, is constant month to month, terminates at
  78% LTV of the original price, and is never charged at 20% down.
- **C10.** The 15-year term carries its own rate.
- **The renter is immune to buyer costs.** Year-50 renter net worth is unmoved by
  mortgage rate, HOA, property tax, maintenance, flood or loan term. It *does*
  move with price, which is correct: a pricier house means a bigger deposit, so
  the renter's month-0 lump sum is genuinely larger.

### UI shape

Five sliders carry the lesson and stay visible: price, rate, starting rent,
appreciation, closing costs to sell. Down payment and term are button groups.
Everything else — budget, rent increase, investment return, maintenance,
insurance, flood, property tax, HOA, and the fixed assumptions — sits behind a
"Show the other assumptions" disclosure. All of it is still on screen in one
click, but the instructor is not hunting through sixteen controls mid-lecture.

## 6. Architecture

```
lib/assumptions.ts   shared rates, imported by both modules
lib/retirement.ts    Module 1 solver, pure
lib/mortgage.ts      amortisation, PMI, tax, net-worth simulation, presets
lib/stats.ts         median and histogram for the dashboard
lib/db.ts            Neon access, lazy so the app runs without it

components/RetirementCalculator.tsx   shared by /retirement and /s/[code]
app/retirement       practice, static
app/rentbuy          Module 2, static
app/instructor       session launcher and QR
app/d/[code]         live dashboard
app/api              session create/close/results, submission
```

Two tables in Neon: `sessions` and `submissions`, with
`unique (session_id, device_hash)` giving dedupe for free. Session codes use an
alphabet excluding 0/O and 1/I/L because students read them off a projector.

## 7. Deliberately not built

- Existing savings balance in Module 1. Most freshmen have none.
- A third 15-year path on the chart. It is a term toggle instead.
- Cross-module linking (home equity at 65 feeding the retirement picture).
  Conceptually lovely, too much for one semester.
- Mortgage interest deduction and capital gains exclusion in the model. Both
  would bury freshmen; one sentence each in a callout is the right size.
- Endogenous house choice. A buyer facing 10% rates would really buy a cheaper
  house; the model reports months over budget instead.

## 8. Changelog

Three corrections, each of which produced a visibly wrong answer before it was
found. This is the most useful part of the document.

**Inflation 3.0% → 2.5%** (CPI-U realised 2.56%, SPF 10-year 2.30%). Re-based
every Module 1 figure on purpose: the worked example went from
$18,908 / $4,278,724 / $644 to $15,190 / $3,281,473 / $531.

**Upkeep stopped tracking market value.** Maintenance and insurance were charged
as a percentage of the *current* value, so they compounded with appreciation. At
5.25% over 50 years that billed $108,489/yr to maintain a house worth ~$650k to
rebuild, and made buyer net worth **fall** as appreciation rose: $6.67M at 2%
down to $4.60M at 5.25%. They are now year-1 dollar costs growing at inflation.

*Consequence worth knowing:* buyer net worth is still not strictly monotonic in
appreciation below about 2%, because property tax legitimately tracks value and
its drag exceeds the gain there. That is real, has its own test, and C1 forbids
appreciation that low anyway.

**The renter stopped being paid by the buyer's costs.** The renter's saving was
defined as `buyerOutlay − renterOutlay`, which quietly made the household budget
a function of the *buyer's* costs. Raising any buyer cost handed the renter money
they would never receive:

| Change to the buyer | Effect on the renter at year 50 |
|---|---|
| $800/mo HOA on a house they do not live in | **+$5.2M** |
| Mortgage rate 4% → 10% | **3.5× wealthier** |
| Property tax 0.5% → 3% | **+$5.8M** |

with identical rent, income and behaviour in every case. Both households now
share an explicit budget. The change also surfaces affordability, which is what
a rate rise actually does: at 8% the Fort Myers buyer is over budget for 55
months, at 10% for 139, and the UI says so instead of letting them borrow the gap.
