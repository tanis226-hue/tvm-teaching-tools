# Time Value of Money Teaching Tools - Design

**Date:** 2026-08-30
**Course:** Business Mathematics (first-semester freshmen), FSW
**Status:** Implemented, then substantially revised on 2026-08-30 after a defaults audit.

> **Revision 2, 2026-08-30.** Two changes re-base almost every number below.
>
> 1. **Inflation moved from 3.0% to 2.5%** (CPI-U realized 1996-2026 is 2.56%; Philadelphia Fed SPF 10-year expectation 2.30%). Every Module 1 figure changed as a result. The published worked example is now **$15,190 / $3,281,473 / $531**, not $18,908 / $4,278,724 / $644. Section 5.6 carries the current values.
> 2. **Maintenance and insurance are no longer percentages of market value.** They are year-1 dollar costs growing with inflation. Charging them on an appreciating value made higher appreciation *reduce* the buyer's net worth, and billed $108,489/yr to maintain a house worth ~$650k to rebuild. Property tax is the only cost that still tracks market value, and for Florida it now models the homestead exemptions and the Save Our Homes cap.
>
> Every Module 2 default was re-sourced at the same time. Section 6.1 is current; the historical rationale in section 3.2 describes the previous retune and is kept for the reasoning, not the numbers.

---

## 1. Purpose

Two web tools that make the time value of money concrete.

**Module 1 (Retirement Calculator)** must deliver three moments in strict order:

1. **The shrinking million.** $1M in 45 years is worth $329,174 today.
2. **The cost of waiting.** Starting at 30 instead of 20 nearly doubles the required contribution ($531 to $949).
3. **The relief.** After two intimidating numbers, the monthly figure is smaller than students feared.

**Module 2 (Rent vs Buy Explorer)** shows that buying a home is a bundle of financial mechanics (amortization, equity, payment lock-in, forced savings, transaction costs), not an aesthetic decision. It surfaces a breakeven year and lets sliders move it. It never declares a winner.

## 2. Scope decisions

**In scope:** both modules, employer match on Module 1, dual presets on Module 2.

**Cut (YAGNI for a freshman class):**

- Existing savings / starting balance. Most freshmen have none.
- A permanent third 15-year mortgage path. Implemented as a term toggle that swaps the 30-year path, not a third line.
- Cross-module linking (home equity at 65 feeding the retirement picture). Conceptually attractive, too much for one semester.

## 3. Corrections to the source PRD

> **Historical.** This section records the first review, done at 3.0% inflation and against the original PRD defaults. The figures in it are the *then*-current ones and are deliberately not updated; the reasoning is what matters. Current values are in sections 5.6 and 6.6.

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
export const INFLATION      = 0.025;  // annual, applied geometric monthly
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

Locked and displayed but not editable: inflation 2.5%, pre-retirement return 7.5%, retirement return 4.0%, life expectancy 85, estate residual 10%, withdrawal growth 2.5%/yr, contribution growth 2.5%/yr.

Locking these is what makes the aggregated class data comparable. Only the student inputs vary.

Validation: `retirement_age > current_age` by at least 1 year. Clamp rather than error, so a fumbling phone user never sees a red state mid-lecture.

### 5.2 Calculation

Let `i = 0.04/12`, `ip = 0.075/12`, `g = (1.025)^(1/12) - 1`, `N` = months saving, `n` = months drawing down.

```
Step 1  P  = income_today * (1.025)^(retirement_age - current_age)
Step 2  PV = P / (i - g) * [ 1 - ((1+g)/(1+i))^n ]
        L  = PV / ( 1 - 0.10 / (1+i)^n )
Step 3  FV_factor = [ (1+ip)^N - (1+g)^N ] / (ip - g)
        PMT1      = L / FV_factor
```

`PMT1` is the first month's contribution, growing at `g` monthly thereafter.

**Edge case:** the growing-annuity formula divides by `(i - g)`. With locked rates (4.0% vs 2.5%) this is safe. Guard it anyway with an explicit check, since the guard is two lines and a future editable-rates feature would otherwise divide by zero silently.

### 5.3 Employer match

Applied as a **post-solve split, never as an input to the solve.** The required total contribution is unchanged; the match only changes who pays it.

```
personal_contribution = PMT1 / (1 + match_rate)
employer_contribution = PMT1 - personal_contribution
```

| Match | You pay | Employer pays |
|---|---|---|
| 0% | $531 | $0 |
| 25% | $425 | $106 |
| 50% | $354 | $177 |
| 100% | $266 | $266 |

Two reasons for this design. It keeps `PMT1` comparable across all students so the class histogram stays meaningful regardless of who set a match. And it dodges the salary problem: a real employer match is "50% up to 6% of salary" and there is no salary input, so a flat contribution multiplier is the honest simplification. Label it on screen as a simplification.

### 5.4 Display order

Non-negotiable sequence. The intimidating numbers must land before the reassuring one.

1. **Inflated income, prominent and immediate.** "$5,000/mo today = $15,190/mo at 65."
2. **Lump sum needed.** $3,281,473.
3. **Monthly contribution.** $531, then the match split if set.

Every nominal figure shows its today's-dollars equivalent alongside. Total contributed ($525,616) and total accumulated ($3,281,473) appear side by side, with the gap labeled explicitly as compounding.

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
| First monthly withdrawal at 65 | $15,190 |
| Lump sum needed | $3,281,473 |
| First monthly contribution | $531 |
| Final monthly contribution | $1,611 |
| Total contributed | $525,616 |

Cost of waiting (retire 65, $5,000/mo): age 20 → $531, 25 → $706, 30 → $949, 35 → $1,296, 40 → $1,813.

Retirement age sensitivity (age 20, $5,000/mo):

| Retire at | Lump sum | Contribution |
|---|---|---|
| 55 | $3,525,641 | $1,305 |
| 60 | $3,467,913 | $844 |
| 65 | $3,281,473 | $531 |
| 70 | $2,918,151 | $317 |
| 75 | $2,313,521 | $170 |

Shrinking million: 20 yr → $610,271 / $1,638,616; 30 yr → $476,743 / $2,097,568; 40 yr → $372,431 / $2,685,064; 45 yr → $329,174 / $3,037,903.

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

A **National / Fort Myers** toggle swaps the entire default set. National opens the lesson because it breaks even; Fort Myers is the second act, and with sourced Lee County inputs it does not.

Every value below was sourced on 2026-08-30. Full citations are in the README.

| Input | National | Fort Myers | Base |
|---|---|---|---|
| Home price | $400,000 | $385,000 | purchase price |
| Down payment | 10% (presets 3.5 / 5 / 10 / 20) | same | NAR 2025 median first-time buyer |
| Mortgage rate | 6.66% (15-yr toggle carries 5.98%) | same | Freddie Mac PMMS 2026-08-27 |
| Closing costs, purchase | 2% of price | 2% | excludes prepaids and escrow |
| Closing costs, sale | 7.0% | 6.7% | applied to the appreciated sale price |
| Property tax | flat 1.00% of market value | Florida homestead + Save Our Homes | see below |
| **Maintenance** | **$4,100/yr** | **$4,200/yr** | **dollars, inflating. Never market value** |
| **Homeowners insurance** | **$2,000/yr** | **$3,576/yr** | **dollars, inflating** |
| **Flood insurance** | off | **$1,975/yr**, toggleable | 75% of Lee County SF flood policies are in a mapped zone |
| HOA | $0/mo, inflating | same | |
| Appreciation | 3.75% | 3.75% | inflation + 1.25pp real |
| PMI | 0.38%/yr of the **original loan** | same | terminates at 78% LTV of original price |
| Starting rent | $2,300/mo | $2,200/mo | Zillow ZORI single-family, 2026-07-31 |
| Rent increase | 3.25% | 3.25% | appreciation less 0.5pp |
| Renters insurance | $25/mo | $30/mo | dollars, inflating |
| Investment return | 7.5% gross | 7.5% gross | shared with Module 1 |
| **Monthly budget** | **$3,300** | **$3,600** | **housing + saving, year-1 dollars, inflating** |
| **Resulting breakeven** | **9.3 yr** | **never** | |
| Months over budget | 0 | 0 | defaults are affordable by construction |

**Why maintenance and insurance are dollars.** Charging them as a percentage of the current market value compounds upkeep with appreciation. That is empirically wrong (about 40% of a home's value is land, per FHFA 2022, and land needs no roof or premium; revealed spending has an elasticity to value of roughly 0.5, not 1.0) and it produced a perverse model in which higher appreciation *reduced* the buyer's net worth. Property tax is the exception and legitimately tracks market value.

**Florida property tax.** Assessed value resets to the purchase price at sale, then grows at min(CPI, 3%) under Save Our Homes. The $25,000 homestead exemption applies to all levies and a CPI-indexed second exemption ($26,411 in 2026) to non-school levies. On the Fort Myers preset this is $5,030 in year 1, **1.31% of market value, falling to 0.73% by year 50** as the cap bites. A flat rate cannot represent a 1.8x spread, which is why the National preset's flat 1.10% is capped in usefulness at about 30 years.

**Fort Myers does not break even, and that is the finding.** The buyer pays $3,568/mo against $2,230 of rent, a gap of $1,338/mo sustained for 247 months. Lee County carrying costs are 3.84% of price per year (tax 1.30 + maintenance 1.09 + homeowners 0.93 + flood 0.51). Price-to-rent is 14.6x, mid-band for the market, so this is not a bad rent figure. It is what SW Florida costs in 2026. This conflicts with the PRD's 5-8 year design target; the resolution is pedagogical, not numerical: National opens the lesson, Fort Myers is the contrast.

### 6.2 Comparison mechanic

Apples-to-apples or the exercise is dishonest.

- **PMI** applies only when the down payment is under 20%, and terminates when the balance reaches 78% of the **original purchase price** on the amortization schedule, per the Homeowners Protection Act. Terminating against the appreciated value instead (the original implementation) ended it at month 48 rather than 143 at 3.5% down, understated lifetime PMI by $11,846, and made the termination month move with the appreciation slider.
- **Month 0:** buyer pays down payment plus purchase closing costs. Renter invests that identical sum at 7.5%.
- **Each month:** buyer outlay is P&I + property tax + insurance + maintenance + HOA + PMI. Renter outlay is rent + renters insurance. Property tax scales with the appreciating home value; insurance, maintenance and HOA are dollar costs growing at inflation; P&I does not move.
- **Both households share one budget** for housing plus saving, `monthlyBudget`, in year-1 dollars growing at inflation. Each invests `budget - its own outlay` at 7.5%. The budget defaults to the buyer's month-1 outlay rounded up to a round number ($3,300 National, $3,600 Fort Myers), so the preset is affordable with a little slack. Sitting exactly on the edge meant a single slider step tripped the over-budget warning, because the default 6.66% rate is off the slider's 0.25% grid.
- **Buyer net worth** = home value - mortgage balance - selling costs + investment balance.
- **Renter net worth** = investment balance.
- **Breakeven** = first month buyer net worth exceeds renter net worth.

**The budget, added after review.** The original rule gave the renter `buyerOutlay - renterOutlay`, which quietly made the household budget a function of the *buyer's* costs. Raising any buyer cost then handed the renter cash they would never actually receive: an $800/mo HOA on a house the renter does not live in left them $5.2M richer by year 50, and a 10% mortgage rate left them 3.5x wealthier than a 4% one, with identical rent and identical behaviour.

Anchoring an explicit budget breaks that causal link. The renter's outcome now depends only on renter-side inputs, which is verified by a test asserting their year-50 net worth is unmoved by mortgage rate, HOA, property tax, maintenance, flood and loan term. It still moves with `price`, and that is correct rather than a leak: a pricier house means a bigger deposit, so the renter's month-0 lump sum genuinely is larger.

The change also surfaces affordability, which is what a rate rise does in reality. At 8% the Fort Myers buyer is over budget for 55 months and at 10% for 139, and the UI says so instead of silently letting the buyer borrow the difference. National's breakeven is unchanged at month 112; Fort Myers still never breaks even.

One consequence worth knowing: buyer net worth is no longer strictly monotonic in appreciation. Below about 2%, property tax (which legitimately tracks market value) drags harder than the appreciation adds, so the curve dips. That is a real effect, not the upkeep bug of the previous revision, and C4 forbids appreciation that low anyway. It is covered by its own test so it stays known behaviour.

**Crossings, added after review.** Reporting only the first crossing is wrong in 190 of 5,184 slider configurations (3.7%), where the paths cross more than once. In the worst case the tool announced "buying pulls ahead in year 5.3" for a run where the renter retook the lead in year 23.3 and held it for the remaining 27 years. The result therefore also carries `crossings` (every month the lead changes hands) and `settledAheadMonth` (the month after the last time the buyer is behind, or null). The headline reports **where the buyer stays ahead**, and names the four outcomes separately: never ahead, cleanly ahead, ahead after several swaps, and ahead in the middle but behind at the end.

**Horizon is 50 years, not 30.** The mortgage is gone at year 30 while rent keeps compounding, and that divergence is the back half of the lesson: the buyer's monthly outlay drops from $4,663 to $2,966 at year 31 while rent climbs from $6,053 to $10,933 by year 50. Extending it does not rig the comparison, which was the PRD's stated fear: the Fort Myers buyer/renter ratio is 1.44x at year 30 and 1.41x at year 50, and the original PRD defaults still never break even even given 50 years. Year-30 figures remain at row index 359, so every published golden is unaffected.

Rent grows geometrically monthly, matching Module 1's convention. HOA inflates at 3%/yr; renters insurance does not. That asymmetry is deliberate: HOA reaches $800/mo on its slider, where holding it flat for 30 years understates the buyer by $87,000, whereas renters insurance is $15/mo and inflating it would shift every published golden figure by 0.38% for no pedagogical gain.

### 6.3 A consequence worth planning for

At realistic rent, the PRD's chart 1 no longer crosses. Rent ($2,300 National) starts above P&I on the carrying-cost comparison and the all-in lines diverge from month 1.

This is a stronger lesson, not a weaker one: your rent already exceeds the mortgage payment on the same house, and the gap only widens. Plot P&I flat against rent rising to show the divergence, and separately mark the **total outlay crossing** at year 7.3 (Fort Myers) or 8.1 (National). That crossing is the honest one, and it is the one that drives the invest-the-difference mechanic.

### 6.4 Charts

1. **Fixed payment vs rising rent.** P&I is a flat line; rent compounds. By year 30 rent is 2.42x its starting figure while P&I has not moved. Mark the total-outlay crossing.
2. **Amortization split.** Principal vs interest per payment. Payment 1 is $246 principal against $1,552 interest: only 13.7% builds equity. Students are genuinely shocked, and more so when it reverses.
3. **Net worth over time**, both paths, breakeven year marked.
4. **Cash out vs wealth kept, both paths.** Charts 4 and 5 of the PRD are merged into one frame: the buyer's consumed spend (interest, tax, upkeep, insurance, PMI, closing costs) as a stacked area against cumulative principal retained, with the renter's cumulative rent as a line on top.

   Two decisions here, both made after the audit. The retained series plots **cumulative principal, not gross equity**: equity includes appreciation the buyer never paid for, and plotting it made green sit above red while the headline said the buyer was behind. And the buyer's consumed total is derived as `buyerOutlay - principal` rather than re-deriving the carrying costs, which is what silently dropped HOA from the original version.

   They are merged rather than split because the renter's investment balance is seeded with the full down payment, so a standalone chart 5 would show the renter's retained wealth exceeding their cash out for the first four years, during exactly the window the module exists to teach.

### 6.5 Concept callouts

- **Forced savings.** Every payment moves money into an asset you own; rent is 100% consumed. Most people do not actually save the spare budget. The tool assumes they do, which favors the renter. Say this out loud in the UI.
- **Payment lock-in.** A 30-year fixed rate is a hedge against rent inflation. Taxes and insurance still rise; principal and interest do not.
- **Equity as accessible capital.** Show available equity over time, with a plain caution that borrowing against a home puts the home at risk.
- **Transaction costs punish short holds.** At a 3-year hold the buyer is $16,294 behind (Fort Myers preset; $17,759 National). This is why breakeven year matters more than the 30-year figure.
- **Total interest paid.** $367,101 over 30 years. Large, sobering, and it keeps the module honest.

### 6.6 Golden test values

| | National | Fort Myers |
|---|---|---|
| Cash to close | $48,000 | $46,200 |
| P&I, flat | $2,313 | $2,227 |
| Breakeven | month 112 (9.3 yr) | none within 50 years |
| Household budget | $3,300/mo | $3,600/mo |
| Total interest, 30 yr | $472,845 | $455,113 |
| Payment 1 principal / interest | $315 / $1,998 | $304 / $1,923 |
| Property tax, year 1 | $4,012 (1.00%, flat) | $5,030 (1.31%, falling to 0.73%) |
| PMI | $114/mo, ends month 110 | $110/mo, ends month 110, $12,070 total |
| Rent yr 1 → yr 50 | $2,300 → $11,352 | $2,200 → $10,858 |
| Buyer NW yr 3 / 10 / 50 | $72,436 / $284,513 / $10,009,412 | $71,537 / $280,148 / $10,289,640 |
| Renter NW yr 50 | $8,365,756 | $12,042,380 |
| Price to rent | 14.5x | 14.6x |

The Module 2 suite asserts constraints, not only values, so a future edit cannot silently reintroduce the bug class that was just removed:

- Lifetime maintenance and insurance must be **identical** at 3.75% and 8% appreciation.
- The renter's year-50 net worth must be **unmoved** by mortgage rate, HOA, property tax, maintenance, flood or loan term. It may move with price, since the deposit they invest changes.
- Buyer net worth must **increase monotonically** with appreciation.
- Property tax must be the **only** cost that varies with market value.
- PMI must terminate, be constant month to month, and never be charged at 20% down.
- Price-to-rent must stay within 10-22x for every preset.
- Appreciation must exceed inflation by 0.5 to 2.0pp, and rent growth must sit 0.5pp below appreciation.

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
