# Time Value of Money Teaching Tools - Design

**Date:** 2026-08-30
**Course:** Business Mathematics (first-semester freshmen), FGCU
**Status:** Implemented. Sections 5.7 and 7.2 were revised during implementation; both revisions are marked inline.

---

## 1. Purpose

Two web tools that make the time value of money concrete.

**Module 1 (Retirement Calculator)** must deliver three moments in strict order:

1. **The shrinking million.** $1M in 45 years is worth $264,439 today.
2. **The cost of waiting.** Starting at 30 instead of 20 nearly doubles the required contribution ($644 to $1,107).
3. **The relief.** After two intimidating numbers, the monthly figure is smaller than students feared.

**Module 2 (Rent vs Buy Explorer)** shows that buying a home is a bundle of financial mechanics (amortization, equity, payment lock-in, forced savings, transaction costs), not an aesthetic decision. It surfaces a breakeven year and lets sliders move it. It never declares a winner.

## 2. Scope decisions

**In scope:** both modules, employer match on Module 1, dual presets on Module 2.

**Cut (YAGNI for a freshman class):**

- Existing savings / starting balance. Most freshmen have none.
- A permanent third 15-year mortgage path. Implemented as a term toggle that swaps the 30-year path, not a third line.
- Cross-module linking (home equity at 65 feeding the retirement picture). Conceptually attractive, too much for one semester.

## 3. Corrections to the source PRD

Two errors were found and resolved during design. Both are recorded here so the reasoning is not lost.

### 3.1 Module 1 is correct as specified

All 27 published figures reproduce to within 0.13%. No changes.

The PRD's two open spec questions are already answered by its own worked example, uniquely:

| Convention | Lump sum | First contribution |
|---|---|---|
| **APR/12 returns, geometric monthly inflation, nominal residual** | **$4,278,724** | **$644** |
| All-geometric | $4,311,350 | $697 |
| All-APR/12 | $4,295,375 | $643 |
| Real residual | $4,447,636 | $669 |

Only the first row matches the published table on both figures. Therefore:

- **Residual is nominal:** 10% of the lump sum `L`, in nominal dollars at age 85.
- **Rate convention:** returns are APR/12, inflation is geometric monthly `(1.03)^(1/12) - 1`.
- **Contributions grow geometrically each month**, not in annual steps. This is what produces a final contribution of $2,430 rather than $2,364.

All three must be stated on screen. Students who rebuild this in Excel with a different convention will otherwise conclude the tool is broken.

### 3.2 Module 2's published defaults never break even

With the PRD defaults, the buyer never overtakes the renter within 30 years and is $398,233 behind at year 30. The PRD's stated guardrail was that buying must not always win. The opposite failure occurred.

The cause is the rent-to-price ratio, not the mortgage rate. $1,800/mo against a $350,000 home is 0.51%/mo, far below any real market. Mortgage rate is nearly irrelevant to the outcome:

Holding rent at $1,800 and sweeping the mortgage rate:

| Mortgage rate | 6.00% | 6.50% | 6.65% | 7.00% | 7.50% |
|---|---|---|---|---|---|
| Breakeven | never | never | never | never | never |

Holding the rate at 6.65% and sweeping starting rent:

| Starting rent | $1,800 | $2,000 | $2,100 | $2,200 | $2,500 |
|---|---|---|---|---|---|
| Breakeven | never | never | 8.6 yr | 6.2 yr | 3.6 yr |

A second error: insurance at 0.5% of value. Florida averages roughly $5,700/yr on $300,000 dwelling coverage, about 1.4% of value, nearly triple the PRD figure.

### 3.3 Verified rates (checked 2026-08-30)

| Assumption | PRD | Verified | Action |
|---|---|---|---|
| Retirement return | 4.0% | 1-yr Treasury 4.02% | Keep 4.0% |
| Mortgage rate | 6.5% | Freddie Mac 30-yr 6.66% | Change to **6.65%** |
| Home price | $350,000 | Fort Myers median sale $348K | Keep $350,000 |

Sources: Freddie Mac PMMS, Federal Reserve H.15, Redfin Fort Myers market data, Insurify Florida home insurance report.

## 4. Shared configuration

Both modules import a single module so assumptions cannot drift.

```ts
// lib/assumptions.ts
export const INFLATION      = 0.03;   // annual, applied geometric monthly
export const RETURN_PRE     = 0.075;  // pre-retirement and renter investment, APR/12
export const RETURN_POST    = 0.040;  // during retirement, APR/12
export const MORTGAGE_RATE  = 0.0665; // Module 2 default only, user-adjustable
export const LIFE_EXPECTANCY = 85;
export const ESTATE_RESIDUAL = 0.10;  // nominal, of lump sum L
```

`RETURN_PRE` is deliberately shared: Module 1's accumulation return and Module 2's renter investment return are the same number, and the modules should say so out loud.

Every screen displays its active assumptions at all times. Both modules carry a "show the formula" toggle.

## 5. Module 1: Retirement Calculator

**Format:** student-facing, mobile-first, reached by QR code during lecture. Submissions aggregate to an instructor dashboard.

### 5.1 Inputs

Student-adjustable:

| Input | Range | Default |
|---|---|---|
| Current age | 16-70 | 20 |
| Target retirement age | 45-80 | 65 |
| Desired monthly income, today's dollars | $500-$50,000 | $5,000 |
| Employer match | 0 / 25 / 50 / 100% presets | 0% |

Locked and displayed but not editable: inflation 3.0%, pre-retirement return 7.5%, retirement return 4.0%, life expectancy 85, estate residual 10%, withdrawal growth 3.0%/yr, contribution growth 3.0%/yr.

Locking these is what makes the aggregated class data comparable. Only the student inputs vary.

Validation: `retirement_age > current_age` by at least 1 year. Clamp rather than error, so a fumbling phone user never sees a red state mid-lecture.

### 5.2 Calculation

Let `i = 0.04/12`, `ip = 0.075/12`, `g = (1.03)^(1/12) - 1`, `N` = months saving, `n` = months drawing down.

```
Step 1  P  = income_today * (1.03)^(retirement_age - current_age)
Step 2  PV = P / (i - g) * [ 1 - ((1+g)/(1+i))^n ]
        L  = PV / ( 1 - 0.10 / (1+i)^n )
Step 3  FV_factor = [ (1+ip)^N - (1+g)^N ] / (ip - g)
        PMT1      = L / FV_factor
```

`PMT1` is the first month's contribution, growing at `g` monthly thereafter.

**Edge case:** the growing-annuity formula divides by `(i - g)`. With locked rates (4.0% vs 3.0%) this is safe. Guard it anyway with an explicit check, since the guard is two lines and a future editable-rates feature would otherwise divide by zero silently.

### 5.3 Employer match

Applied as a **post-solve split, never as an input to the solve.** The required total contribution is unchanged; the match only changes who pays it.

```
personal_contribution = PMT1 / (1 + match_rate)
employer_contribution = PMT1 - personal_contribution
```

| Match | You pay | Employer pays |
|---|---|---|
| 0% | $644 | $0 |
| 25% | $515 | $129 |
| 50% | $429 | $215 |
| 100% | $322 | $322 |

Two reasons for this design. It keeps `PMT1` comparable across all students so the class histogram stays meaningful regardless of who set a match. And it dodges the salary problem: a real employer match is "50% up to 6% of salary" and there is no salary input, so a flat contribution multiplier is the honest simplification. Label it on screen as a simplification.

### 5.4 Display order

Non-negotiable sequence. The intimidating numbers must land before the reassuring one.

1. **Inflated income, prominent and immediate.** "$5,000/mo today = $18,908/mo at 65."
2. **Lump sum needed.** $4,278,724.
3. **Monthly contribution.** $644, then the match split if set.

Every nominal figure shows its today's-dollars equivalent alongside. Total contributed ($726,388) and total accumulated ($4,278,724) appear side by side, with the gap labeled explicitly as compounding.

### 5.5 Charts

1. **Accumulation curve.** Balance over time, contributions vs growth shaded separately. The growth wedge should visibly dominate in the final decade.
2. **Purchasing power decay.** What $1 today is worth each year to age 85.
3. **Cost of waiting.** Bar chart of required contribution by start age.
4. **Drawdown depletion.** Balance from retirement to 85, landing on the 10% residual.

### 5.6 Golden test values

The solver is locked to these. They become the test suite.

Age 20, retire 65, $5,000/mo:

| Output | Value |
|---|---|
| First monthly withdrawal at 65 | $18,908 |
| Lump sum needed | $4,278,724 |
| First monthly contribution | $644 |
| Final monthly contribution | $2,430 |
| Total contributed | $726,388 |

Cost of waiting (retire 65, $5,000/mo): age 20 → $644, 25 → $839, 30 → $1,107, 35 → $1,486, 40 → $2,042.

Retirement age sensitivity (age 20, $5,000/mo):

| Retire at | Lump sum | Contribution |
|---|---|---|
| 55 | $4,475,000 | $1,556 |
| 60 | $4,461,945 | $1,015 |
| 65 | $4,278,724 | $644 |
| 70 | $3,855,055 | $387 |
| 75 | $3,095,719 | $209 |

Shrinking million: 20 yr → $553,676 / $1,806,111; 30 yr → $411,987 / $2,427,262; 40 yr → $306,557 / $3,262,038; 45 yr → $264,439 / $3,781,596.

Tolerance: 0.5%.

### 5.7 Class aggregation

Session-scoped. The instructor generates a session code; the QR encodes the URL carrying that code.

**Captured per submission:** current age, retirement age, desired monthly income, match rate, and the three computed outputs.

**Not captured:** names, student IDs, any PII. Anonymous by design. This avoids FERPA questions entirely and produces more honest answers.

**Instructor dashboard:** histogram of desired monthly income (the spread is the lesson), median/min/max, scatter of retirement age vs required contribution, class-wide totals. Presentable on a projector: large type, readable from the back of the room. Auto-refresh so submissions appear live.

**Read access, decided during implementation.** Results are readable by session code alone, without the instructor token. The code is already public on the projector and the data is anonymous by construction, so gating reads would add friction without protecting anything. The instructor token still gates session closure, which is the only destructive action.

**Dedupe:** a device hash, unique per session, stops one student from skewing the distribution. Re-submitting from the same device updates that row rather than inserting a new one.

The hash is a random UUID minted on first visit and kept in `localStorage`, then salted with the session code before storage. It is deliberately not a fingerprint: it identifies a browser, not a person, and a student who clears storage or switches phones can submit again. That is an acceptable ceiling for a classroom poll and keeps the anonymity claim in the previous paragraph literally true.

## 6. Module 2: Rent vs Buy Explorer

**Format:** instructor-driven from the front, projector-first, sliders adjusted live. No class poll, no persistence. Run a hands-up straw poll first ("who thinks renting is smarter?"), then let the tool respond to that intuition.

### 6.1 Two presets

A **Fort Myers / National** toggle swaps the entire default set. This makes the sensitivity lesson vivid: the same decision flips depending on where you live.

| Input | Fort Myers | National |
|---|---|---|
| Home price | $350,000 | $350,000 |
| Down payment | 20% (presets 3.5 / 5 / 10 / 20) | same |
| Mortgage rate | 6.65% | 6.65% |
| Term | 30 yr (15-yr toggle) | same |
| Closing costs, purchase | 3% of price | same |
| Closing costs, sale | 6% of sale price | same |
| Property tax | 1.1%/yr of value | 1.1%/yr |
| Maintenance | 1.0%/yr of value | 1.0%/yr |
| **Insurance** | **1.4%/yr of value** | **0.5%/yr** |
| HOA | $0/mo | $0/mo |
| Appreciation | 3.5%/yr | 3.5%/yr |
| PMI | 0.5%/yr of balance, drops at 20% equity | same |
| **Starting rent** | **$2,500/mo** | **$2,200/mo** |
| Rent increase | 3.0%/yr | 3.0%/yr |
| Renters insurance | $15/mo | $15/mo |
| Investment return | 7.5%/yr | 7.5%/yr |
| **Resulting breakeven** | **5.7 yr** | **6.2 yr** |

Both land inside the PRD's required 5-8 year window.

### 6.2 Comparison mechanic

Apples-to-apples or the exercise is dishonest.

- **Month 0:** buyer pays down payment plus purchase closing costs. Renter invests that identical sum at 7.5%.
- **Each month:** buyer outlay is P&I + property tax + insurance + maintenance + HOA + PMI. Renter outlay is rent + renters insurance. Property tax, insurance and maintenance scale with the appreciating home value; P&I does not.
- Whoever pays less that month invests the difference at 7.5%.
- **Buyer net worth** = home value - mortgage balance - selling costs + investment balance.
- **Renter net worth** = investment balance.
- **Breakeven** = first month buyer net worth exceeds renter net worth.

Rent grows geometrically monthly, matching Module 1's convention.

### 6.3 A consequence worth planning for

At realistic rent, the PRD's chart 1 no longer crosses. Rent ($2,500) starts above P&I ($1,798) and diverges from month 1.

This is a stronger lesson, not a weaker one: your rent already exceeds the mortgage payment on the same house, and the gap only widens. Plot P&I flat against rent rising to show the divergence, and separately mark the **total outlay crossing** at year 7.3 (Fort Myers) or 8.1 (National). That crossing is the honest one, and it is the one that drives the invest-the-difference mechanic.

### 6.4 Charts

1. **Fixed payment vs rising rent.** P&I is a flat line; rent compounds. By year 30 rent is 2.42x its starting figure while P&I has not moved. Mark the total-outlay crossing.
2. **Amortization split.** Principal vs interest per payment. Payment 1 is $246 principal against $1,552 interest: only 13.7% builds equity. Students are genuinely shocked, and more so when it reverses.
3. **Net worth over time**, both paths, breakeven year marked.
4. **Where the money went.** Stacked area for the buyer: interest, tax, maintenance, insurance (gone) vs principal (retained). A counterweight to any impression that buying is free money.
5. **Cumulative cash out vs wealth retained**, both paths.

### 6.5 Concept callouts

- **Forced savings.** Every payment moves money into an asset you own; rent is 100% consumed. Most people do not actually invest the difference. The tool assumes they do, which favors the renter. Say this out loud in the UI.
- **Payment lock-in.** A 30-year fixed rate is a hedge against rent inflation. Taxes and insurance still rise; principal and interest do not.
- **Equity as accessible capital.** Show available equity over time, with a plain caution that borrowing against a home puts the home at risk.
- **Transaction costs punish short holds.** At a 3-year hold the buyer is $16,294 behind (Fort Myers preset; $17,759 National). This is why breakeven year matters more than the 30-year figure.
- **Total interest paid.** $367,101 over 30 years. Large, sobering, and it keeps the module honest.

### 6.6 Golden test values

Both presets, $350,000 at 6.65%, 20% down, 30-year term:

| | Fort Myers | National |
|---|---|---|
| Upfront cash | $80,500 | $80,500 |
| P&I, flat 30 yrs | $1,798 | $1,798 |
| Breakeven | month 68 (5.7 yr) | month 74 (6.2 yr) |
| Total interest | $367,101 | $367,101 |
| Payment 1 principal / interest | $246 / $1,552 | $246 / $1,552 |
| Total outlay crossing | yr 7.3 | yr 8.1 |
| Rent yr 1 → yr 30 | $2,500 → $6,053 | $2,200 → $5,327 |
| Equity at yr 5 / 10 / 30 | $153,132 / $255,450 / $982,378 | same |
| Buyer NW at yr 3 / 10 / 30 | $94,533 / $228,099 / $1,247,769 | $94,533 / $227,078 / $1,231,894 |
| Renter NW at yr 3 / 10 / 30 | $110,827 / $194,443 / $867,374 | $112,292 / $199,677 / $890,722 |

Buyer net worth is identical across presets in early years because the buyer invests nothing while their outlay exceeds the renter's. The preset difference surfaces in the renter's balance. This is correct behavior, not a bug, and the test suite should assert it deliberately.

Slider sanity, Fort Myers preset: appreciation 2.0% → 12.9 yr, 5.0% → 3.2 yr; return 6.0% → 4.5 yr, 9.0% → 9.0 yr; rate 5.5% → 3.7 yr, 8.0% → 19.2 yr; 15-year term → 5.9 yr. The breakeven must remain responsive across this range, since watching it move is the entire point of the module.

## 7. Architecture

Next.js App Router with Neon Postgres.

```
lib/assumptions.ts     single source of shared rates (section 4)
lib/retirement.ts      Module 1 solver, pure functions, no I/O
lib/mortgage.ts        amortization, PMI drop, net-worth simulation
lib/db.ts              Neon client

app/s/[code]/          student calculator, mobile-first
app/d/[code]/          instructor dashboard, projector type
app/rentbuy/           Module 2, fully client-side, no persistence
app/api/sessions/      POST create session, returns code + instructor token
app/api/submit/        POST a submission, upsert on device hash
```

Charts via Recharts. Module 2 holds all state client-side and touches no API.

### 7.1 Data model

```sql
create table sessions (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,        -- 6 chars, unambiguous alphabet
  instructor_token text not null,
  created_at       timestamptz not null default now(),
  closed_at        timestamptz
);

create table submissions (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references sessions(id) on delete cascade,
  device_hash        text not null,
  current_age        int  not null,
  retirement_age     int  not null,
  desired_income     numeric not null,
  match_rate         numeric not null default 0,
  first_withdrawal   numeric not null,
  lump_sum           numeric not null,
  first_contribution numeric not null,
  created_at         timestamptz not null default now(),
  unique (session_id, device_hash)
);
```

The unique constraint gives dedupe for free: re-submitting from the same device upserts.

Session codes use an unambiguous alphabet (no 0/O, 1/I/L) because students read them off a projector.

### 7.2 Trust boundary

**Revised during implementation.** The original plan accepted client-computed outputs on the grounds that recomputing would mean a duplicated solver. That objection turned out not to apply: the submit route runs in Node and imports `lib/retirement.ts` directly, so recomputation costs one function call and no duplication. The route therefore ignores any client-supplied outputs and stores its own, making the persisted figures authoritative.

The client still sends only the three inputs plus a match rate. Remaining mitigations are proportionate to a classroom poll: Zod range validation mirrored by Postgres check constraints, the per-session device-hash unique constraint, and an instructor control to close a session.

### 7.3 Testing

`lib/retirement.ts` and `lib/mortgage.ts` are pure functions with no I/O, tested against the golden values in sections 5.6 and 6.6 at 0.5% tolerance. These tests are the guard against silent numerical drift, which is the failure mode that would embarrass the tool in front of a class.

## 8. Build order

1. Shared config, both solvers, golden test suites. Nothing renders until the math is locked.
2. Module 1 student view and Neon persistence.
3. Module 1 instructor dashboard.
4. Module 2, which is pure client-side once `lib/mortgage.ts` exists.

Module 1 ships first: it has the backend, the students, and the deadline.
