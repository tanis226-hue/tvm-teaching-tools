# TVM Teaching Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two web tools for a freshman Business Mathematics course: a mobile retirement calculator with anonymous class aggregation, and a projector-driven rent vs buy explorer.

**Architecture:** Next.js App Router. All financial math lives in pure, I/O-free functions under `lib/`, locked to golden test values taken from the spec's verified worked examples. Module 1 persists anonymous submissions to Neon Postgres through two API routes. Module 2 is entirely client-side and touches no database. A single `lib/assumptions.ts` holds every shared rate so the two modules cannot drift apart.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript 7.0.2, Tailwind CSS 4.3.3, Recharts 3.10.1, Neon serverless 1.1.0, Zod 4.5.4, Vitest 4.1.11, qrcode.

**Spec:** `docs/superpowers/specs/2026-08-30-tvm-teaching-tools-design.md`

## Global Constraints

- **Rate convention, non-negotiable:** returns are APR/12 (`rate / 12`). Inflation and all 3%/yr growth series are geometric monthly (`(1.03)**(1/12) - 1`). Mixing these changes published answers and breaks the golden tests.
- **Estate residual is nominal:** 10% of lump sum `L` in nominal dollars at age 85.
- **Contributions and withdrawals grow geometrically every month**, never in annual steps.
- **Golden test tolerance is 0.5%** relative.
- **Module 1 display order is fixed:** inflated income, then lump sum, then monthly contribution. Never reorder.
- **No PII is ever collected or stored.** No names, no student IDs, no emails, no IP addresses.
- **Module 2 has no persistence and no network calls.**
- All money displayed with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })` unless a cent-level figure is specifically called for.
- Every screen displays its active assumptions at all times.

---

### Task 1: Scaffold, shared assumptions, test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `lib/assumptions.ts`
- Create: `lib/format.ts`
- Test: `lib/assumptions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `INFLATION`, `RETURN_PRE`, `RETURN_POST`, `MORTGAGE_RATE`, `LIFE_EXPECTANCY`, `ESTATE_RESIDUAL`, `MONTHLY_INFLATION`, `monthlyRate(annual: number): number`, `geometricMonthly(annual: number): number` from `lib/assumptions.ts`. `usd(n: number): string`, `pct(n: number): string` from `lib/format.ts`.

- [ ] **Step 1: Scaffold the app**

Run from the repo root (`C:\Users\tanis\Documents\GitHub\tvm-teaching-tools`):

```bash
npx --yes create-next-app@16.3.3 . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --use-npm --yes
```

If the directory-not-empty prompt appears, accept keeping existing files. The `docs/` and `.git/` directories must survive.

- [ ] **Step 2: Add remaining dependencies**

```bash
npm install recharts@3.10.1 @neondatabase/serverless@1.1.0 zod@4.5.4 qrcode && npm install -D vitest@4.1.11 @types/qrcode
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing assumptions test**

Create `lib/assumptions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  INFLATION, RETURN_PRE, RETURN_POST, MORTGAGE_RATE,
  LIFE_EXPECTANCY, ESTATE_RESIDUAL, MONTHLY_INFLATION,
  monthlyRate, geometricMonthly,
} from './assumptions'

describe('locked class assumptions', () => {
  it('holds the values the spec publishes', () => {
    expect(INFLATION).toBe(0.03)
    expect(RETURN_PRE).toBe(0.075)
    expect(RETURN_POST).toBe(0.04)
    expect(MORTGAGE_RATE).toBe(0.0665)
    expect(LIFE_EXPECTANCY).toBe(85)
    expect(ESTATE_RESIDUAL).toBe(0.1)
  })

  it('uses APR/12 for returns', () => {
    expect(monthlyRate(0.075)).toBeCloseTo(0.00625, 10)
    expect(monthlyRate(0.04)).toBeCloseTo(0.0033333333, 9)
  })

  it('uses geometric monthly for inflation, not APR/12', () => {
    expect(MONTHLY_INFLATION).toBeCloseTo(0.0024662698, 9)
    expect(MONTHLY_INFLATION).not.toBeCloseTo(0.03 / 12, 6)
  })

  it('compounds geometric monthly back to the annual rate', () => {
    expect((1 + geometricMonthly(0.035)) ** 12 - 1).toBeCloseTo(0.035, 12)
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./assumptions`.

- [ ] **Step 6: Implement assumptions and formatters**

Create `lib/assumptions.ts`:

```ts
export const INFLATION = 0.03
export const RETURN_PRE = 0.075
export const RETURN_POST = 0.04
export const MORTGAGE_RATE = 0.0665
export const LIFE_EXPECTANCY = 85
export const ESTATE_RESIDUAL = 0.1

export function monthlyRate(annual: number): number {
  return annual / 12
}

export function geometricMonthly(annual: number): number {
  return (1 + annual) ** (1 / 12) - 1
}

export const MONTHLY_INFLATION = geometricMonthly(INFLATION)

export const ASSUMPTION_LABELS = [
  { label: 'Inflation', value: '3.0%', note: 'Conventional teaching figure' },
  { label: 'Return before retirement', value: '7.5%', note: 'Diversified equity-weighted portfolio' },
  { label: 'Return during retirement', value: '4.0%', note: '1-year Treasury, verified Aug 2026' },
  { label: 'Life expectancy', value: '85', note: 'Fixed, so drawdown falls out of retirement age' },
  { label: 'Estate residual at 85', value: '10%', note: 'Pot does not run to exactly zero' },
  { label: 'Withdrawals grow at', value: '3.0%/yr', note: 'Purchasing power maintained' },
  { label: 'Contributions grow at', value: '3.0%/yr', note: 'Step up with salary' },
] as const
```

Create `lib/format.ts`:

```ts
const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

export function usd(n: number): string {
  return money.format(Math.round(n))
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(n * 100 % 1 === 0 ? 1 : 2)}%`
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 4 tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with locked class assumptions"
```

---

### Task 2: Retirement solver and 27 golden tests

**Files:**
- Create: `lib/retirement.ts`
- Test: `lib/retirement.test.ts`

**Interfaces:**
- Consumes: `INFLATION`, `RETURN_PRE`, `RETURN_POST`, `LIFE_EXPECTANCY`, `ESTATE_RESIDUAL`, `MONTHLY_INFLATION`, `monthlyRate` from `lib/assumptions.ts`.
- Produces:
  - `type RetirementInput = { currentAge: number; retirementAge: number; desiredMonthlyIncome: number; matchRate?: number }`
  - `type RetirementResult` with fields `firstWithdrawal`, `lumpSum`, `firstContribution`, `finalContribution`, `totalContributed`, `personalContribution`, `employerContribution`, `monthsSaving`, `monthsDrawing`
  - `solveRetirement(input: RetirementInput): RetirementResult`
  - `accumulationSeries(input: RetirementInput): { month: number; age: number; balance: number; contributed: number; growth: number }[]`
  - `drawdownSeries(input: RetirementInput): { month: number; age: number; balance: number; withdrawal: number }[]`
  - `costOfWaiting(input: RetirementInput, startAges: number[]): { startAge: number; contribution: number }[]`
  - `purchasingPowerSeries(fromAge: number, toAge: number): { age: number; value: number }[]`
  - `toTodaysDollars(nominal: number, yearsFromNow: number): number`

- [ ] **Step 1: Write the failing golden tests**

Create `lib/retirement.test.ts`. These values come from the spec section 5.6 and must not be edited to fit the implementation:

```ts
import { describe, it, expect } from 'vitest'
import {
  solveRetirement, accumulationSeries, drawdownSeries,
  costOfWaiting, toTodaysDollars,
} from './retirement'
import { ESTATE_RESIDUAL } from './assumptions'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

const BASE = { currentAge: 20, retirementAge: 65, desiredMonthlyIncome: 5000 }

describe('published worked example: age 20, retire 65, $5,000/mo', () => {
  const r = solveRetirement(BASE)
  it('inflates income to the retirement date', () => near(r.firstWithdrawal, 18908))
  it('computes the lump sum', () => near(r.lumpSum, 4278724))
  it('computes the first contribution', () => near(r.firstContribution, 644))
  it('computes the final contribution', () => near(r.finalContribution, 2430))
  it('computes total contributed', () => near(r.totalContributed, 726388))
})

describe('cost of waiting, retire 65, $5,000/mo', () => {
  const cases: [number, number][] =
    [[20, 644], [25, 839], [30, 1107], [35, 1486], [40, 2042]]
  it.each(cases)('start age %i requires $%i', (age, want) => {
    near(solveRetirement({ ...BASE, currentAge: age }).firstContribution, want)
  })

  it('is exposed as a series by costOfWaiting', () => {
    const series = costOfWaiting(BASE, [20, 25, 30, 35, 40])
    expect(series.map(s => s.startAge)).toEqual([20, 25, 30, 35, 40])
    near(series[0].contribution, 644)
    near(series[4].contribution, 2042)
  })
})

describe('retirement age sensitivity, age 20, $5,000/mo', () => {
  const cases: [number, number, number][] = [
    [55, 4475000, 1556], [60, 4461945, 1015], [65, 4278724, 644],
    [70, 3855055, 387], [75, 3095719, 209],
  ]
  it.each(cases)('retire at %i', (age, lump, pmt) => {
    const r = solveRetirement({ ...BASE, retirementAge: age })
    near(r.lumpSum, lump)
    near(r.firstContribution, pmt)
  })
})

describe('the shrinking million', () => {
  const cases: [number, number, number][] = [
    [20, 553676, 1806111], [30, 411987, 2427262],
    [40, 306557, 3262038], [45, 264439, 3781596],
  ]
  it.each(cases)('over %i years', (years, back, forward) => {
    near(toTodaysDollars(1_000_000, years), back)
    near(1_000_000 * 1.03 ** years, forward)
  })
})

describe('employer match is a post-solve split', () => {
  const cases: [number, number][] = [[0, 644], [0.25, 515], [0.5, 429], [1, 322]]
  it.each(cases)('match %d leaves the student paying $%i', (rate, personal) => {
    const r = solveRetirement({ ...BASE, matchRate: rate })
    near(r.personalContribution, personal)
    near(r.firstContribution, 644)
    near(r.personalContribution + r.employerContribution, r.firstContribution)
  })
})

describe('accumulation series', () => {
  const r = solveRetirement(BASE)
  const series = accumulationSeries(BASE)

  it('runs one point per month of saving', () => {
    expect(series).toHaveLength(r.monthsSaving)
  })
  it('ends at the required lump sum', () => near(series.at(-1)!.balance, r.lumpSum))
  it('splits balance into contributed plus growth', () => {
    const last = series.at(-1)!
    near(last.contributed + last.growth, last.balance)
    near(last.contributed, 726388)
  })
  it('shows growth dominating contributions by the end', () => {
    expect(series.at(-1)!.growth).toBeGreaterThan(series.at(-1)!.contributed * 3)
  })
})

describe('drawdown series', () => {
  const r = solveRetirement(BASE)
  const series = drawdownSeries(BASE)

  it('runs one point per month of retirement', () => {
    expect(series).toHaveLength(r.monthsDrawing)
  })
  it('starts by withdrawing the inflated income', () => {
    near(series[0].withdrawal, 18908)
  })
  it('lands on the 10 percent nominal residual', () => {
    near(series.at(-1)!.balance, r.lumpSum * ESTATE_RESIDUAL)
  })
  it('never goes negative', () => {
    expect(series.every(p => p.balance >= 0)).toBe(true)
  })
})

describe('guards', () => {
  it('rejects a retirement age at or below the current age', () => {
    expect(() => solveRetirement({ ...BASE, currentAge: 65 })).toThrow(/retirement age/i)
  })
  it('rejects a retirement age at or above life expectancy', () => {
    expect(() => solveRetirement({ ...BASE, retirementAge: 85 })).toThrow(/life expectancy/i)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test lib/retirement.test.ts`
Expected: FAIL, cannot resolve `./retirement`.

- [ ] **Step 3: Implement the solver**

Create `lib/retirement.ts`:

```ts
import {
  INFLATION, RETURN_PRE, RETURN_POST, LIFE_EXPECTANCY,
  ESTATE_RESIDUAL, MONTHLY_INFLATION, monthlyRate,
} from './assumptions'

export type RetirementInput = {
  currentAge: number
  retirementAge: number
  desiredMonthlyIncome: number
  matchRate?: number
}

export type RetirementResult = {
  firstWithdrawal: number
  lumpSum: number
  firstContribution: number
  finalContribution: number
  totalContributed: number
  personalContribution: number
  employerContribution: number
  monthsSaving: number
  monthsDrawing: number
}

const ip = monthlyRate(RETURN_PRE)
const i = monthlyRate(RETURN_POST)
const g = MONTHLY_INFLATION

function validate({ currentAge, retirementAge }: RetirementInput) {
  if (retirementAge <= currentAge) {
    throw new Error('Retirement age must be greater than current age')
  }
  if (retirementAge >= LIFE_EXPECTANCY) {
    throw new Error('Retirement age must be below life expectancy')
  }
  // The growing-annuity formulas divide by (i - g) and (ip - g). Locked rates
  // make this safe; the guard exists because editable rates would divide by
  // zero silently and produce Infinity on a projector.
  if (i === g || ip === g) {
    throw new Error('Return rate must differ from the growth rate')
  }
}

export function solveRetirement(input: RetirementInput): RetirementResult {
  validate(input)
  const { currentAge, retirementAge, desiredMonthlyIncome, matchRate = 0 } = input

  const yearsSaving = retirementAge - currentAge
  const yearsDrawing = LIFE_EXPECTANCY - retirementAge
  const N = yearsSaving * 12
  const n = yearsDrawing * 12

  const firstWithdrawal = desiredMonthlyIncome * (1 + INFLATION) ** yearsSaving

  const pv = (firstWithdrawal / (i - g)) * (1 - ((1 + g) / (1 + i)) ** n)
  const lumpSum = pv / (1 - ESTATE_RESIDUAL / (1 + i) ** n)

  const fvFactor = ((1 + ip) ** N - (1 + g) ** N) / (ip - g)
  const firstContribution = lumpSum / fvFactor

  const finalContribution = firstContribution * (1 + g) ** (N - 1)
  const totalContributed = (firstContribution * ((1 + g) ** N - 1)) / g

  const personalContribution = firstContribution / (1 + matchRate)

  return {
    firstWithdrawal,
    lumpSum,
    firstContribution,
    finalContribution,
    totalContributed,
    personalContribution,
    employerContribution: firstContribution - personalContribution,
    monthsSaving: N,
    monthsDrawing: n,
  }
}

export function accumulationSeries(input: RetirementInput) {
  const { firstContribution, monthsSaving } = solveRetirement(input)
  const out = []
  let balance = 0
  let contributed = 0

  for (let m = 1; m <= monthsSaving; m++) {
    const payment = firstContribution * (1 + g) ** (m - 1)
    balance = balance * (1 + ip) + payment
    contributed += payment
    out.push({
      month: m,
      age: input.currentAge + m / 12,
      balance,
      contributed,
      growth: balance - contributed,
    })
  }
  return out
}

export function drawdownSeries(input: RetirementInput) {
  const { lumpSum, firstWithdrawal, monthsDrawing } = solveRetirement(input)
  const out = []
  let balance = lumpSum

  for (let m = 1; m <= monthsDrawing; m++) {
    const withdrawal = firstWithdrawal * (1 + g) ** (m - 1)
    balance = balance * (1 + i) - withdrawal
    out.push({
      month: m,
      age: input.retirementAge + m / 12,
      balance: Math.max(0, balance),
      withdrawal,
    })
  }
  return out
}

export function costOfWaiting(input: RetirementInput, startAges: number[]) {
  return startAges
    .filter(startAge => startAge < input.retirementAge)
    .map(startAge => ({
      startAge,
      contribution: solveRetirement({ ...input, currentAge: startAge }).firstContribution,
    }))
}

export function purchasingPowerSeries(fromAge: number, toAge: number) {
  const out = []
  for (let age = fromAge; age <= toAge; age++) {
    out.push({ age, value: 1 / (1 + INFLATION) ** (age - fromAge) })
  }
  return out
}

export function toTodaysDollars(nominal: number, yearsFromNow: number): number {
  return nominal / (1 + INFLATION) ** yearsFromNow
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test lib/retirement.test.ts`
Expected: PASS, all cases green.

If the drawdown residual test fails, the bug is almost certainly `lumpSum` being grossed up with a real rather than nominal residual. The nominal form terminates at exactly `0.10 * L` by construction: `(L - PV) * (1+i)^n` equals `0.10 * L`.

- [ ] **Step 5: Commit**

```bash
git add lib/retirement.ts lib/retirement.test.ts
git commit -m "feat: retirement solver locked to published worked examples"
```

---

### Task 3: Rent vs buy solver and golden tests

**Files:**
- Create: `lib/mortgage.ts`
- Test: `lib/mortgage.test.ts`

**Interfaces:**
- Consumes: `RETURN_PRE`, `MORTGAGE_RATE`, `geometricMonthly`, `monthlyRate` from `lib/assumptions.ts`.
- Produces:
  - `type RentBuyInput` with fields `price`, `downPct`, `rate`, `termYears`, `closingBuyPct`, `closingSellPct`, `taxPct`, `maintPct`, `insPct`, `hoaMonthly`, `apprPct`, `pmiPct`, `startingRent`, `rentIncreasePct`, `rentersInsMonthly`, `investReturn`
  - `type MonthRow` with fields `month`, `pi`, `principal`, `interest`, `pmi`, `rent`, `buyerOutlay`, `renterOutlay`, `homeValue`, `balance`, `equity`, `buyerNetWorth`, `renterNetWorth`
  - `type RentBuyResult` with fields `monthlyPI`, `upfront`, `breakevenMonth` (nullable), `outlayCrossingMonth` (nullable), `totalInterest`, `rows`
  - `simulateRentBuy(input: RentBuyInput): RentBuyResult`
  - `FORT_MYERS: RentBuyInput`, `NATIONAL: RentBuyInput`, `PRESETS: Record<'fortMyers' | 'national', RentBuyInput>`

- [ ] **Step 1: Write the failing golden tests**

Create `lib/mortgage.test.ts`. Values come from spec section 6.6:

```ts
import { describe, it, expect } from 'vitest'
import { simulateRentBuy, FORT_MYERS, NATIONAL, PRESETS } from './mortgage'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

describe('Fort Myers preset', () => {
  const r = simulateRentBuy(FORT_MYERS)
  it('requires $80,500 upfront', () => near(r.upfront, 80500))
  it('has a flat P&I of $1,798', () => near(r.monthlyPI, 1798))
  it('breaks even at month 68', () => expect(r.breakevenMonth).toBe(68))
  it('pays $367,101 total interest', () => near(r.totalInterest, 367101))
  it('splits payment 1 into $246 principal and $1,552 interest', () => {
    near(r.rows[0].principal, 246)
    near(r.rows[0].interest, 1552)
  })
  it('crosses on total outlay in year 7.3', () => {
    expect(Math.round(r.outlayCrossingMonth! / 12 * 10) / 10).toBe(7.3)
  })
  it('grows rent from $2,500 to $6,053', () => {
    near(r.rows[0].rent, 2500)
    near(r.rows[359].rent, 6053)
  })
  it('builds equity of $153,132 / $255,450 / $982,378', () => {
    near(r.rows[59].equity, 153132)
    near(r.rows[119].equity, 255450)
    near(r.rows[359].equity, 982378)
  })
  it('tracks net worth at years 3, 10 and 30', () => {
    near(r.rows[35].buyerNetWorth, 94533)
    near(r.rows[35].renterNetWorth, 110827)
    near(r.rows[119].buyerNetWorth, 228099)
    near(r.rows[119].renterNetWorth, 194443)
    near(r.rows[359].buyerNetWorth, 1247769)
    near(r.rows[359].renterNetWorth, 867374)
  })
})

describe('National preset', () => {
  const r = simulateRentBuy(NATIONAL)
  it('breaks even at month 74', () => expect(r.breakevenMonth).toBe(74))
  it('crosses on total outlay in year 8.1', () => {
    expect(Math.round(r.outlayCrossingMonth! / 12 * 10) / 10).toBe(8.1)
  })
  it('grows rent from $2,200 to $5,327', () => {
    near(r.rows[0].rent, 2200)
    near(r.rows[359].rent, 5327)
  })
  it('tracks net worth at years 3, 10 and 30', () => {
    near(r.rows[35].renterNetWorth, 112292)
    near(r.rows[119].buyerNetWorth, 227078)
    near(r.rows[359].buyerNetWorth, 1231894)
  })
})

describe('the two presets share buyer-side figures', () => {
  const fm = simulateRentBuy(FORT_MYERS)
  const nat = simulateRentBuy(NATIONAL)

  it('has identical equity, since equity ignores rent and insurance', () => {
    near(fm.rows[359].equity, nat.rows[359].equity)
  })

  // Deliberate assertion, not an oversight. While the buyer's outlay exceeds
  // the renter's, the buyer invests nothing, so buyer net worth is purely
  // home value minus balance minus selling costs. Insurance differences
  // surface only in the RENTER's invested balance. This looks like a bug on
  // inspection and is not.
  it('has identical early buyer net worth despite different insurance', () => {
    near(fm.rows[35].buyerNetWorth, nat.rows[35].buyerNetWorth)
    expect(fm.rows[35].renterNetWorth).not.toBeCloseTo(nat.rows[35].renterNetWorth, 0)
  })
})

describe('both presets land in the required 5-8 year window', () => {
  it.each(Object.entries(PRESETS))('%s', (_name, preset) => {
    const years = simulateRentBuy(preset).breakevenMonth! / 12
    expect(years).toBeGreaterThanOrEqual(5)
    expect(years).toBeLessThanOrEqual(8)
  })
})

describe('breakeven stays responsive to the instructor sliders', () => {
  const cases: [string, Partial<typeof FORT_MYERS>, number][] = [
    ['appreciation 2.0%', { apprPct: 0.02 }, 9.3],
    ['appreciation 5.0%', { apprPct: 0.05 }, 2.8],
    ['return 6.0%', { investReturn: 0.06 }, 3.8],
    ['return 9.0%', { investReturn: 0.09 }, 6.1],
    ['rate 5.5%', { rate: 0.055 }, 3.2],
    ['rate 8.0%', { rate: 0.08 }, 9.8],
    ['15-year term', { termYears: 15 }, 4.8],
  ]
  it.each(cases)('%s moves breakeven to about %s years', (_l, patch, want) => {
    const r = simulateRentBuy({ ...FORT_MYERS, ...patch })
    expect(Math.abs(r.breakevenMonth! / 12 - want)).toBeLessThan(0.15)
  })
})

describe('PMI', () => {
  it('is charged below 20% equity and drops once reached', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, downPct: 0.035 })
    expect(r.rows[0].pmi).toBeGreaterThan(0)
    expect(r.rows[359].pmi).toBe(0)
  })
  it('is never charged at 20% down', () => {
    const r = simulateRentBuy(FORT_MYERS)
    expect(r.rows.every(row => row.pmi === 0)).toBe(true)
  })
})

describe('the PRD defaults that failed review', () => {
  it('never breaks even, which is why they were retuned', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, startingRent: 1800, insPct: 0.005 })
    expect(r.breakevenMonth).toBeNull()
    expect(r.rows[359].buyerNetWorth).toBeLessThan(r.rows[359].renterNetWorth)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test lib/mortgage.test.ts`
Expected: FAIL, cannot resolve `./mortgage`.

- [ ] **Step 3: Implement the simulation**

Create `lib/mortgage.ts`:

```ts
import { RETURN_PRE, MORTGAGE_RATE, geometricMonthly, monthlyRate } from './assumptions'

export type RentBuyInput = {
  price: number
  downPct: number
  rate: number
  termYears: number
  closingBuyPct: number
  closingSellPct: number
  taxPct: number
  maintPct: number
  insPct: number
  hoaMonthly: number
  apprPct: number
  pmiPct: number
  startingRent: number
  rentIncreasePct: number
  rentersInsMonthly: number
  investReturn: number
}

export type MonthRow = {
  month: number
  pi: number
  principal: number
  interest: number
  pmi: number
  rent: number
  buyerOutlay: number
  renterOutlay: number
  homeValue: number
  balance: number
  equity: number
  buyerNetWorth: number
  renterNetWorth: number
}

export type RentBuyResult = {
  monthlyPI: number
  upfront: number
  breakevenMonth: number | null
  outlayCrossingMonth: number | null
  totalInterest: number
  rows: MonthRow[]
}

const HORIZON_MONTHS = 360

export function simulateRentBuy(input: RentBuyInput): RentBuyResult {
  const r = monthlyRate(input.rate)
  const N = input.termYears * 12
  const retM = monthlyRate(input.investReturn)
  const apprM = geometricMonthly(input.apprPct)
  const rentM = geometricMonthly(input.rentIncreasePct)

  let balance = input.price * (1 - input.downPct)
  const monthlyPI = r === 0 ? balance / N : (balance * r) / (1 - (1 + r) ** -N)
  const upfront = input.price * input.downPct + input.price * input.closingBuyPct

  let homeValue = input.price
  let buyerInvest = 0
  let renterInvest = upfront
  let totalInterest = 0
  let breakevenMonth: number | null = null
  let outlayCrossingMonth: number | null = null
  const rows: MonthRow[] = []

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const active = m <= N && balance > 0
    const interest = active ? balance * r : 0
    const principal = active ? Math.min(monthlyPI - interest, balance) : 0
    const pi = active ? monthlyPI : 0

    balance = Math.max(0, balance - principal)
    totalInterest += interest
    homeValue *= 1 + apprM

    const pmi = balance / homeValue > 0.8 ? (balance * input.pmiPct) / 12 : 0
    const carrying =
      (homeValue * (input.taxPct + input.maintPct + input.insPct)) / 12
    const buyerOutlay = pi + carrying + input.hoaMonthly + pmi

    const rent = input.startingRent * (1 + rentM) ** (m - 1)
    const renterOutlay = rent + input.rentersInsMonthly

    buyerInvest *= 1 + retM
    renterInvest *= 1 + retM
    const diff = renterOutlay - buyerOutlay
    if (diff > 0) buyerInvest += diff
    else renterInvest += -diff

    const equity = homeValue - balance
    const buyerNetWorth =
      homeValue - balance - homeValue * input.closingSellPct + buyerInvest
    const renterNetWorth = renterInvest

    if (breakevenMonth === null && buyerNetWorth > renterNetWorth) breakevenMonth = m
    if (outlayCrossingMonth === null && renterOutlay > buyerOutlay) outlayCrossingMonth = m

    rows.push({
      month: m, pi, principal, interest, pmi, rent,
      buyerOutlay, renterOutlay, homeValue, balance, equity,
      buyerNetWorth, renterNetWorth,
    })
  }

  return { monthlyPI, upfront, breakevenMonth, outlayCrossingMonth, totalInterest, rows }
}

const SHARED = {
  price: 350_000,
  downPct: 0.2,
  rate: MORTGAGE_RATE,
  termYears: 30,
  closingBuyPct: 0.03,
  closingSellPct: 0.06,
  taxPct: 0.011,
  maintPct: 0.01,
  hoaMonthly: 0,
  apprPct: 0.035,
  pmiPct: 0.005,
  rentIncreasePct: 0.03,
  rentersInsMonthly: 15,
  investReturn: RETURN_PRE,
}

export const FORT_MYERS: RentBuyInput = {
  ...SHARED, insPct: 0.014, startingRent: 2500,
}

export const NATIONAL: RentBuyInput = {
  ...SHARED, insPct: 0.005, startingRent: 2200,
}

export const PRESETS = { fortMyers: FORT_MYERS, national: NATIONAL } as const

export const DOWN_PAYMENT_PRESETS = [0.035, 0.05, 0.1, 0.2] as const
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, both solver suites green.

- [ ] **Step 5: Commit**

```bash
git add lib/mortgage.ts lib/mortgage.test.ts
git commit -m "feat: rent vs buy simulation with retuned dual presets"
```

---

### Task 4: Neon schema, database layer, session codes

**Files:**
- Create: `db/schema.sql`
- Create: `lib/db.ts`
- Create: `lib/session-code.ts`
- Modify: `.env.example`
- Test: `lib/session-code.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `generateSessionCode(): string` and `SESSION_CODE_ALPHABET` from `lib/session-code.ts`
  - `sql` tagged template from `lib/db.ts`
  - `createSession(): Promise<{ code: string; instructorToken: string }>`
  - `getSession(code: string): Promise<{ id: string; code: string; closedAt: Date | null } | null>`
  - `upsertSubmission(args: SubmissionArgs): Promise<void>` where `SubmissionArgs` is `{ sessionId, deviceHash, currentAge, retirementAge, desiredIncome, matchRate, firstWithdrawal, lumpSum, firstContribution }`
  - `listSubmissions(sessionId: string): Promise<SubmissionRow[]>`
  - `closeSession(code: string, instructorToken: string): Promise<boolean>`

- [ ] **Step 1: Write the failing session-code test**

Create `lib/session-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateSessionCode, SESSION_CODE_ALPHABET } from './session-code'

describe('session codes', () => {
  it('is six characters', () => {
    expect(generateSessionCode()).toHaveLength(6)
  })

  it('excludes glyphs that are ambiguous on a projector', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) {
      expect(SESSION_CODE_ALPHABET).not.toContain(bad)
    }
  })

  it('draws only from the published alphabet', () => {
    for (let n = 0; n < 500; n++) {
      for (const ch of generateSessionCode()) {
        expect(SESSION_CODE_ALPHABET).toContain(ch)
      }
    }
  })

  it('does not obviously repeat', () => {
    const seen = new Set(Array.from({ length: 500 }, generateSessionCode))
    expect(seen.size).toBeGreaterThan(495)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test lib/session-code.test.ts`
Expected: FAIL, cannot resolve `./session-code`.

- [ ] **Step 3: Implement session codes**

Create `lib/session-code.ts`:

```ts
// Students read these off a projector, so 0/O and 1/I/L are excluded.
export const SESSION_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateSessionCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += SESSION_CODE_ALPHABET[b % SESSION_CODE_ALPHABET.length]
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test lib/session-code.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the schema**

Create `db/schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists sessions (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  instructor_token text not null,
  created_at       timestamptz not null default now(),
  closed_at        timestamptz
);

create table if not exists submissions (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references sessions(id) on delete cascade,
  device_hash        text not null,
  current_age        int not null check (current_age between 16 and 70),
  retirement_age     int not null check (retirement_age between 45 and 80),
  desired_income     numeric not null check (desired_income between 500 and 50000),
  match_rate         numeric not null default 0 check (match_rate between 0 and 1),
  first_withdrawal   numeric not null,
  lump_sum           numeric not null,
  first_contribution numeric not null,
  created_at         timestamptz not null default now(),
  unique (session_id, device_hash)
);

create index if not exists submissions_session_idx on submissions (session_id);
```

The check constraints mirror the Zod schema in Task 5. Both exist on purpose: Zod gives a clean error message, the constraints make bad data unrepresentable.

- [ ] **Step 6: Implement the database layer**

Create `lib/db.ts`:

```ts
import { neon } from '@neondatabase/serverless'
import { generateSessionCode } from './session-code'

export const sql = neon(process.env.DATABASE_URL!)

export type SubmissionRow = {
  device_hash: string
  current_age: number
  retirement_age: number
  desired_income: number
  match_rate: number
  first_withdrawal: number
  lump_sum: number
  first_contribution: number
  created_at: string
}

export async function createSession() {
  const code = generateSessionCode()
  const instructorToken = crypto.randomUUID()
  await sql`
    insert into sessions (code, instructor_token)
    values (${code}, ${instructorToken})
  `
  return { code, instructorToken }
}

export async function getSession(code: string) {
  const rows = await sql`
    select id, code, closed_at from sessions where code = ${code.toUpperCase()}
  `
  return rows[0] ?? null
}

export type SubmissionArgs = {
  sessionId: string
  deviceHash: string
  currentAge: number
  retirementAge: number
  desiredIncome: number
  matchRate: number
  firstWithdrawal: number
  lumpSum: number
  firstContribution: number
}

export async function upsertSubmission(a: SubmissionArgs) {
  await sql`
    insert into submissions (
      session_id, device_hash, current_age, retirement_age, desired_income,
      match_rate, first_withdrawal, lump_sum, first_contribution
    ) values (
      ${a.sessionId}, ${a.deviceHash}, ${a.currentAge}, ${a.retirementAge},
      ${a.desiredIncome}, ${a.matchRate}, ${a.firstWithdrawal}, ${a.lumpSum},
      ${a.firstContribution}
    )
    on conflict (session_id, device_hash) do update set
      current_age = excluded.current_age,
      retirement_age = excluded.retirement_age,
      desired_income = excluded.desired_income,
      match_rate = excluded.match_rate,
      first_withdrawal = excluded.first_withdrawal,
      lump_sum = excluded.lump_sum,
      first_contribution = excluded.first_contribution,
      created_at = now()
  `
}

export async function listSubmissions(sessionId: string): Promise<SubmissionRow[]> {
  return (await sql`
    select device_hash, current_age, retirement_age, desired_income, match_rate,
           first_withdrawal, lump_sum, first_contribution, created_at
    from submissions where session_id = ${sessionId} order by created_at
  `) as SubmissionRow[]
}

export async function closeSession(code: string, instructorToken: string) {
  const rows = await sql`
    update sessions set closed_at = now()
    where code = ${code.toUpperCase()} and instructor_token = ${instructorToken}
    returning id
  `
  return rows.length > 0
}
```

- [ ] **Step 7: Provision Neon and apply the schema**

This step needs a Neon account and cannot be automated.

1. Create a project at https://console.neon.tech
2. Copy the pooled connection string.
3. Write `.env.local` in the repo root:

```
DATABASE_URL=postgresql://...
```

4. Write `.env.example` with `DATABASE_URL=` and no value, and confirm `.env*` is gitignored while `!.env.example` is not.
5. Apply the schema by pasting `db/schema.sql` into the Neon SQL Editor.

Verify with:

```bash
node --env-file=.env.local -e "const{neon}=require('@neondatabase/serverless');neon(process.env.DATABASE_URL)\`select table_name from information_schema.tables where table_schema='public'\`.then(r=>console.log(r))"
```

Expected: rows for `sessions` and `submissions`.

- [ ] **Step 8: Commit**

```bash
git add db/schema.sql lib/db.ts lib/session-code.ts lib/session-code.test.ts .env.example
git commit -m "feat: Neon schema, database layer and projector-safe session codes"
```

---

### Task 5: API routes

**Files:**
- Create: `app/api/sessions/route.ts`
- Create: `app/api/sessions/[code]/close/route.ts`
- Create: `app/api/submit/route.ts`
- Create: `lib/validation.ts`
- Test: `lib/validation.test.ts`

**Interfaces:**
- Consumes: `createSession`, `getSession`, `upsertSubmission`, `closeSession` from `lib/db.ts`; `solveRetirement` from `lib/retirement.ts`.
- Produces: `submissionSchema` from `lib/validation.ts`. `POST /api/sessions` returns `{ code, instructorToken }`. `POST /api/submit` accepts `{ code, deviceHash, currentAge, retirementAge, desiredIncome, matchRate }` and returns `{ ok: true }`. `POST /api/sessions/[code]/close` accepts `{ instructorToken }`.

- [ ] **Step 1: Write the failing validation test**

Create `lib/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { submissionSchema } from './validation'

const valid = {
  code: 'A2B3C4', deviceHash: 'abc123', currentAge: 20,
  retirementAge: 65, desiredIncome: 5000, matchRate: 0,
}

describe('submission validation', () => {
  it('accepts a well-formed submission', () => {
    expect(submissionSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['current age below 16', { currentAge: 15 }],
    ['current age above 70', { currentAge: 71 }],
    ['retirement age below 45', { retirementAge: 44 }],
    ['retirement age above 80', { retirementAge: 81 }],
    ['income below $500', { desiredIncome: 499 }],
    ['income above $50,000', { desiredIncome: 50001 }],
    ['match rate above 1', { matchRate: 1.5 }],
    ['negative match rate', { matchRate: -0.1 }],
  ])('rejects %s', (_label, patch) => {
    expect(submissionSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })

  it('rejects a retirement age at or below the current age', () => {
    const r = submissionSchema.safeParse({ ...valid, currentAge: 65, retirementAge: 65 })
    expect(r.success).toBe(false)
  })

  it('uppercases the session code', () => {
    const r = submissionSchema.parse({ ...valid, code: 'a2b3c4' })
    expect(r.code).toBe('A2B3C4')
  })

  it('carries no field that could hold PII', () => {
    const keys = Object.keys(submissionSchema.parse(valid))
    for (const banned of ['name', 'email', 'studentId', 'ip']) {
      expect(keys).not.toContain(banned)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test lib/validation.test.ts`
Expected: FAIL, cannot resolve `./validation`.

- [ ] **Step 3: Implement validation**

Create `lib/validation.ts`:

```ts
import { z } from 'zod'

export const submissionSchema = z
  .object({
    code: z.string().length(6).transform(s => s.toUpperCase()),
    deviceHash: z.string().min(8).max(128),
    currentAge: z.number().int().min(16).max(70),
    retirementAge: z.number().int().min(45).max(80),
    desiredIncome: z.number().min(500).max(50_000),
    matchRate: z.number().min(0).max(1).default(0),
  })
  .refine(d => d.retirementAge > d.currentAge, {
    message: 'Retirement age must be greater than current age',
    path: ['retirementAge'],
  })

export type SubmissionPayload = z.infer<typeof submissionSchema>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test lib/validation.test.ts`
Expected: PASS, 12 cases.

- [ ] **Step 5: Implement the session creation route**

Create `app/api/sessions/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await createSession()
  return NextResponse.json(session, { status: 201 })
}
```

- [ ] **Step 6: Implement the submit route**

Create `app/api/submit/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession, upsertSubmission } from '@/lib/db'
import { solveRetirement } from '@/lib/retirement'
import { submissionSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const parsed = submissionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid submission' },
      { status: 400 },
    )
  }
  const d = parsed.data

  const session = await getSession(d.code)
  if (!session) return NextResponse.json({ error: 'Unknown session code' }, { status: 404 })
  if (session.closed_at) {
    return NextResponse.json({ error: 'This session is closed' }, { status: 409 })
  }

  // Recomputed server-side rather than trusted from the client. The solver is
  // already imported here, so the cost is one function call, not a duplicated
  // implementation.
  const r = solveRetirement({
    currentAge: d.currentAge,
    retirementAge: d.retirementAge,
    desiredMonthlyIncome: d.desiredIncome,
    matchRate: d.matchRate,
  })

  await upsertSubmission({
    sessionId: session.id,
    deviceHash: d.deviceHash,
    currentAge: d.currentAge,
    retirementAge: d.retirementAge,
    desiredIncome: d.desiredIncome,
    matchRate: d.matchRate,
    firstWithdrawal: r.firstWithdrawal,
    lumpSum: r.lumpSum,
    firstContribution: r.firstContribution,
  })

  return NextResponse.json({ ok: true })
}
```

Note this improves on the spec's section 7.2. The spec accepted client-computed outputs to avoid a duplicated solver; because the route runs in Node and can import `lib/retirement.ts` directly, there is no duplication and the stored numbers are authoritative. Update spec section 7.2 in Task 10.

- [ ] **Step 7: Implement the close route**

Create `app/api/sessions/[code]/close/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { closeSession } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const { instructorToken } = await req.json()
  if (typeof instructorToken !== 'string') {
    return NextResponse.json({ error: 'Missing instructor token' }, { status: 400 })
  }
  const ok = await closeSession(code, instructorToken)
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Not authorized' }, { status: 403 })
}
```

- [ ] **Step 8: Verify the routes end to end**

```bash
npm run dev
```

In a second shell:

```bash
CODE=$(curl -s -XPOST localhost:3000/api/sessions | node -pe "JSON.parse(require('fs').readFileSync(0)).code")
curl -s -XPOST localhost:3000/api/submit -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\",\"deviceHash\":\"testdevice1\",\"currentAge\":20,\"retirementAge\":65,\"desiredIncome\":5000,\"matchRate\":0}"
```

Expected: `{"ok":true}`. Repeat the submit verbatim and confirm it still returns `ok` and creates only one row (the upsert path). Then submit with `"currentAge":15` and confirm a 400.

- [ ] **Step 9: Commit**

```bash
git add app/api lib/validation.ts lib/validation.test.ts
git commit -m "feat: session and submission API routes with server-side recomputation"
```

---

### Task 6: Module 1 student calculator

**Files:**
- Create: `app/s/[code]/page.tsx`
- Create: `components/AssumptionsPanel.tsx`
- Create: `components/FormulaToggle.tsx`
- Create: `components/ResultCard.tsx`
- Create: `components/NumberField.tsx`
- Create: `lib/device.ts`

**Interfaces:**
- Consumes: `solveRetirement`, `toTodaysDollars` from `lib/retirement.ts`; `usd` from `lib/format.ts`; `ASSUMPTION_LABELS` from `lib/assumptions.ts`.
- Produces: `getDeviceHash(code: string): string` from `lib/device.ts`. Components `AssumptionsPanel`, `FormulaToggle`, `ResultCard` (props `{ label, nominal, todaysDollars?, emphasis?: 'hero' | 'normal' }`), `NumberField` (props `{ label, value, min, max, step, suffix?, onChange }`).

- [ ] **Step 1: Implement the device hash**

Create `lib/device.ts`:

```ts
// Identifies a browser, not a person. A student who clears storage or
// switches phones can submit again; that ceiling is acceptable for a
// classroom poll and keeps the anonymity claim literally true.
export function getDeviceHash(code: string): string {
  const key = 'tvm-device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return `${code}:${id}`
}
```

- [ ] **Step 2: Build the shared presentation components**

Create `components/NumberField.tsx`:

```tsx
'use client'

export function NumberField({
  label, value, min, max, step = 1, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; suffix?: string; onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="number" inputMode="numeric" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          onBlur={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-lg tabular-nums
                     focus:border-slate-900 focus:outline-none"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      <input
        type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-slate-900"
      />
    </label>
  )
}
```

Create `components/ResultCard.tsx`:

```tsx
import { usd } from '@/lib/format'

export function ResultCard({
  label, nominal, todaysDollars, emphasis = 'normal', caption,
}: {
  label: string; nominal: number; todaysDollars?: number
  emphasis?: 'hero' | 'normal'; caption?: string
}) {
  const hero = emphasis === 'hero'
  return (
    <div className={`rounded-2xl border p-5 ${hero ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}>
      <p className={`text-sm font-medium ${hero ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${hero ? 'text-4xl' : 'text-2xl'}`}>
        {usd(nominal)}
      </p>
      {todaysDollars !== undefined && (
        <p className={`mt-1 text-sm tabular-nums ${hero ? 'text-slate-300' : 'text-slate-500'}`}>
          {usd(todaysDollars)} in today&apos;s dollars
        </p>
      )}
      {caption && (
        <p className={`mt-2 text-sm ${hero ? 'text-slate-300' : 'text-slate-500'}`}>{caption}</p>
      )}
    </div>
  )
}
```

Create `components/AssumptionsPanel.tsx`:

```tsx
import { ASSUMPTION_LABELS } from '@/lib/assumptions'

export function AssumptionsPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-sm font-semibold text-slate-700">Class assumptions</h2>
      <p className="mt-1 text-xs text-slate-500">
        Locked so everyone&apos;s answers are comparable. Returns use APR &divide; 12;
        inflation compounds monthly at (1.03)<sup>1/12</sup> &minus; 1.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {ASSUMPTION_LABELS.map(a => (
          <div key={a.label} className="flex justify-between gap-4 border-b border-slate-200 py-1">
            <dt className="text-sm text-slate-600">{a.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-slate-900">{a.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
```

Create `components/FormulaToggle.tsx`:

```tsx
'use client'
import { useState } from 'react'

export function FormulaToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm font-medium text-slate-700 underline underline-offset-4"
      >
        {open ? 'Hide the formula' : 'Show the formula'}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build the student page**

Create `app/s/[code]/page.tsx`. The result order is fixed by the spec: inflated income, then lump sum, then contribution.

```tsx
'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { solveRetirement, toTodaysDollars } from '@/lib/retirement'
import { getDeviceHash } from '@/lib/device'
import { usd } from '@/lib/format'
import { NumberField } from '@/components/NumberField'
import { ResultCard } from '@/components/ResultCard'
import { AssumptionsPanel } from '@/components/AssumptionsPanel'
import { FormulaToggle } from '@/components/FormulaToggle'
import { RetirementCharts } from '@/components/RetirementCharts'

const MATCH_PRESETS = [0, 0.25, 0.5, 1]

export default function StudentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [currentAge, setCurrentAge] = useState(20)
  const [retirementAge, setRetirementAge] = useState(65)
  const [desiredIncome, setDesiredIncome] = useState(5000)
  const [matchRate, setMatchRate] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const safeRetirementAge = Math.max(retirementAge, currentAge + 1)
  const input = { currentAge, retirementAge: safeRetirementAge, desiredMonthlyIncome: desiredIncome, matchRate }
  const r = useMemo(() => solveRetirement(input), [currentAge, safeRetirementAge, desiredIncome, matchRate])
  const years = safeRetirementAge - currentAge

  useEffect(() => { setStatus('idle') }, [currentAge, safeRetirementAge, desiredIncome, matchRate])

  async function submit() {
    setStatus('sending')
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code, deviceHash: getDeviceHash(code),
        currentAge, retirementAge: safeRetirementAge, desiredIncome, matchRate,
      }),
    })
    if (res.ok) return setStatus('sent')
    setError((await res.json()).error ?? 'Something went wrong')
    setStatus('error')
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">What will retirement cost you?</h1>
        <p className="mt-1 text-sm text-slate-500">Session {code}</p>
      </header>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <NumberField label="Your age now" value={currentAge} min={16} max={70}
          onChange={n => { setCurrentAge(n); if (retirementAge <= n) setRetirementAge(n + 1) }} />
        <NumberField label="Retire at age" value={retirementAge} min={45} max={80}
          onChange={setRetirementAge} />
        <NumberField label="Monthly income you want, in today's dollars"
          value={desiredIncome} min={500} max={50000} step={100} onChange={setDesiredIncome} />

        <div>
          <span className="text-sm font-medium text-slate-600">Employer match</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MATCH_PRESETS.map(m => (
              <button key={m} onClick={() => setMatchRate(m)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  matchRate === m ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'
                }`}>
                {m === 0 ? 'None' : `${m * 100}%`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Order is fixed by the spec: the intimidating numbers land before the reassuring one. */}
      <ResultCard emphasis="hero"
        label={`${usd(desiredIncome)}/mo today becomes, at ${safeRetirementAge}`}
        nominal={r.firstWithdrawal} todaysDollars={desiredIncome}
        caption={`${years} years of 3% inflation. That is your first month's withdrawal.`} />

      <ResultCard label="Lump sum you need at retirement" nominal={r.lumpSum}
        todaysDollars={toTodaysDollars(r.lumpSum, years)}
        caption="Enough to draw a rising income to 85 and leave 10% behind." />

      <ResultCard label="Save this much per month, starting now" nominal={r.firstContribution}
        todaysDollars={r.firstContribution}
        caption={`Rising 3% a year to ${usd(r.finalContribution)} by age ${safeRetirementAge - 1}.`} />

      {matchRate > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <ResultCard label="You pay" nominal={r.personalContribution} />
          <ResultCard label="Employer pays" nominal={r.employerContribution} />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700">Where the money comes from</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">You contribute</p>
            <p className="text-xl font-semibold tabular-nums">{usd(r.totalContributed)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">You end up with</p>
            <p className="text-xl font-semibold tabular-nums">{usd(r.lumpSum)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The {usd(r.lumpSum - r.totalContributed)} gap is compounding, not saving.
        </p>
      </section>

      <RetirementCharts input={input} />
      <AssumptionsPanel />

      <FormulaToggle>
        <pre>{`i  = 0.04/12          monthly return in retirement
ip = 0.075/12         monthly return while saving
g  = 1.03^(1/12) - 1  monthly inflation
N  = ${String(r.monthsSaving).padStart(3)} months saving
n  = ${String(r.monthsDrawing).padStart(3)} months drawing down

P  = ${desiredIncome} x 1.03^${years} = ${Math.round(r.firstWithdrawal)}
PV = P / (i - g) x [1 - ((1+g)/(1+i))^n]
L  = PV / (1 - 0.10/(1+i)^n) = ${Math.round(r.lumpSum)}
FV = [(1+ip)^N - (1+g)^N] / (ip - g)
PMT = L / FV = ${Math.round(r.firstContribution)}`}</pre>
      </FormulaToggle>

      <button onClick={submit} disabled={status === 'sending' || status === 'sent'}
        className="w-full rounded-xl bg-slate-900 py-4 text-lg font-semibold text-white disabled:bg-slate-400">
        {status === 'sent' ? 'Sent to the class results' : status === 'sending' ? 'Sending...' : 'Send my answer to the class'}
      </button>
      {status === 'sent' && (
        <p className="text-center text-sm text-slate-500">
          Anonymous. Change anything above and send again to update your answer.
        </p>
      )}
      {status === 'error' && <p className="text-center text-sm text-red-600">{error}</p>}
    </main>
  )
}
```

- [ ] **Step 4: Verify in the browser**

Run `npm run dev`, create a session via the API, then open `/s/<CODE>` at a 390px viewport.

Confirm: the inflated income reads $18,908 at the defaults, lump sum $4,278,724, contribution $644. Set current age to 30 and confirm the contribution becomes $1,107. Set the match to 50% and confirm the split reads $429 and $215 while the headline contribution stays $644. Submit, then submit again, and confirm the dashboard later shows a single row.

- [ ] **Step 5: Commit**

```bash
git add app/s components lib/device.ts
git commit -m "feat: Module 1 student calculator, mobile-first"
```

---

### Task 7: Module 1 charts

**Files:**
- Create: `components/RetirementCharts.tsx`
- Create: `components/ChartFrame.tsx`

**Interfaces:**
- Consumes: `accumulationSeries`, `drawdownSeries`, `costOfWaiting`, `purchasingPowerSeries` from `lib/retirement.ts`; `RetirementInput` type.
- Produces: `RetirementCharts` (props `{ input: RetirementInput }`), `ChartFrame` (props `{ title, note?, children }`).

- [ ] **Step 1: Build the chart frame**

Create `components/ChartFrame.tsx`:

```tsx
export function ChartFrame({
  title, note, children,
}: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      <div className="mt-3 h-56 w-full">{children}</div>
    </section>
  )
}
```

- [ ] **Step 2: Build the four charts**

Create `components/RetirementCharts.tsx`:

```tsx
'use client'

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  accumulationSeries, drawdownSeries, costOfWaiting,
  purchasingPowerSeries, type RetirementInput,
} from '@/lib/retirement'
import { LIFE_EXPECTANCY, ESTATE_RESIDUAL } from '@/lib/assumptions'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

// One point per year keeps 540 months from choking the SVG on a phone.
const yearly = <T extends { month: number }>(rows: T[]) => rows.filter(r => r.month % 12 === 0)

export function RetirementCharts({ input }: { input: RetirementInput }) {
  const accum = yearly(accumulationSeries(input))
  const draw = yearly(drawdownSeries(input))
  const waiting = costOfWaiting(input, [20, 25, 30, 35, 40].filter(a => a < input.retirementAge))
  const power = purchasingPowerSeries(input.currentAge, LIFE_EXPECTANCY)
  const residual = accum.at(-1)!.balance * ESTATE_RESIDUAL

  return (
    <div className="space-y-4">
      <ChartFrame title="Your balance over time"
        note="Blue is what you put in. Green is what compounding added.">
        <ResponsiveContainer>
          <AreaChart data={accum}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={a => String(Math.round(a))} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={(v: number) => usd(v)}
              labelFormatter={a => `Age ${Math.round(Number(a))}`} />
            <Area type="monotone" dataKey="contributed" stackId="1" name="Contributed"
              stroke="#1d4ed8" fill="#bfdbfe" />
            <Area type="monotone" dataKey="growth" stackId="1" name="Growth"
              stroke="#15803d" fill="#bbf7d0" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="What $1 today will be worth"
        note={`3% inflation, from age ${input.currentAge} to ${LIFE_EXPECTANCY}.`}>
        <ResponsiveContainer>
          <LineChart data={power}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" fontSize={11} />
            <YAxis domain={[0, 1]} tickFormatter={v => `$${v.toFixed(2)}`} fontSize={11} width={48} />
            <Tooltip formatter={(v: number) => `$${v.toFixed(3)}`}
              labelFormatter={a => `Age ${a}`} />
            <Line type="monotone" dataKey="value" name="Purchasing power"
              stroke="#b91c1c" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="The cost of waiting"
        note="Same target, same retirement age. Only the start date changes.">
        <ResponsiveContainer>
          <BarChart data={waiting}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="startAge" tickFormatter={a => `Start ${a}`} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={(v: number) => `${usd(v)}/mo`}
              labelFormatter={a => `Starting at ${a}`} />
            <Bar dataKey="contribution" name="Monthly contribution" fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Drawing it back down"
        note={`From ${input.retirementAge} to ${LIFE_EXPECTANCY}, landing on ${usd(residual)} left over.`}>
        <ResponsiveContainer>
          <AreaChart data={draw}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={a => String(Math.round(a))} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={(v: number) => usd(v)}
              labelFormatter={a => `Age ${Math.round(Number(a))}`} />
            <Area type="monotone" dataKey="balance" name="Balance"
              stroke="#7c3aed" fill="#ddd6fe" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
```

- [ ] **Step 3: Verify in the browser**

Reload `/s/<CODE>`. Confirm all four charts render at a 390px viewport with no horizontal page scroll, the growth band visibly dominates the contributed band in the final decade, the cost-of-waiting bars rise left to right, and the drawdown area lands on a non-zero residual rather than hitting the axis.

- [ ] **Step 4: Commit**

```bash
git add components/RetirementCharts.tsx components/ChartFrame.tsx
git commit -m "feat: Module 1 charts"
```

---

### Task 8: Instructor dashboard and session launcher

**Files:**
- Create: `app/d/[code]/page.tsx`
- Create: `app/api/sessions/[code]/results/route.ts`
- Create: `app/instructor/page.tsx`
- Create: `components/DashboardCharts.tsx`
- Create: `lib/stats.ts`
- Test: `lib/stats.test.ts`

**Interfaces:**
- Consumes: `getSession`, `listSubmissions`, `SubmissionRow` from `lib/db.ts`.
- Produces: `median(xs: number[]): number`, `histogram(xs: number[], edges: number[]): { label: string; count: number }[]`, `INCOME_BUCKETS: number[]` from `lib/stats.ts`. `GET /api/sessions/[code]/results` returns `{ submissions: SubmissionRow[] }`.

- [ ] **Step 1: Write the failing stats test**

Create `lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { median, histogram, INCOME_BUCKETS } from './stats'

describe('median', () => {
  it('averages the middle pair for an even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('takes the middle for an odd count', () => {
    expect(median([5, 1, 3])).toBe(3)
  })
  it('returns 0 for an empty set', () => {
    expect(median([])).toBe(0)
  })
  it('does not mutate its input', () => {
    const xs = [3, 1, 2]
    median(xs)
    expect(xs).toEqual([3, 1, 2])
  })
})

describe('histogram', () => {
  it('counts values into half-open buckets', () => {
    const h = histogram([1000, 2000, 2500, 9000], [0, 2000, 5000, 10000])
    expect(h.map(b => b.count)).toEqual([1, 2, 1])
  })
  it('puts values at or above the last edge into the final bucket', () => {
    const h = histogram([12000], [0, 2000, 5000, 10000])
    expect(h.at(-1)!.count).toBe(1)
  })
  it('covers the full spec income range', () => {
    expect(INCOME_BUCKETS[0]).toBeLessThanOrEqual(500)
    expect(INCOME_BUCKETS.at(-1)).toBeGreaterThanOrEqual(50000)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test lib/stats.test.ts`
Expected: FAIL, cannot resolve `./stats`.

- [ ] **Step 3: Implement stats**

Create `lib/stats.ts`:

```ts
export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

export const INCOME_BUCKETS = [0, 2000, 4000, 6000, 8000, 10000, 15000, 50000]

export function histogram(xs: number[], edges: number[]) {
  const buckets = edges.slice(0, -1).map((lo, idx) => ({
    label: idx === edges.length - 2 ? `${lo / 1000}k+` : `${lo / 1000}-${edges[idx + 1] / 1000}k`,
    count: 0,
  }))
  for (const x of xs) {
    let idx = edges.findIndex((lo, i) => i < edges.length - 1 && x >= lo && x < edges[i + 1])
    if (idx === -1) idx = buckets.length - 1
    buckets[idx].count++
  }
  return buckets
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test lib/stats.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Implement the results route**

Create `app/api/sessions/[code]/results/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession, listSubmissions } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const session = await getSession(code)
  if (!session) return NextResponse.json({ error: 'Unknown session' }, { status: 404 })
  return NextResponse.json({ submissions: await listSubmissions(session.id) })
}
```

Results are readable by code alone. The code is on the projector anyway, and the data is anonymous by construction, so gating reads behind the instructor token would add friction without protecting anything.

- [ ] **Step 6: Build the session launcher**

Create `app/instructor/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

export default function InstructorPage() {
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')

  async function start() {
    const res = await fetch('/api/sessions', { method: 'POST' })
    const { code } = await res.json()
    setCode(code)
    setQr(await QRCode.toDataURL(`${location.origin}/s/${code}`, { width: 640, margin: 1 }))
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Retirement calculator</h1>
      {!code ? (
        <button onClick={start}
          className="mt-8 rounded-xl bg-slate-900 px-8 py-4 text-xl font-semibold text-white">
          Start a class session
        </button>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-2xl text-slate-600">Scan to join</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="mx-auto w-80" />
          <p className="font-mono text-7xl font-bold tracking-widest text-slate-900">{code}</p>
          <a href={`/d/${code}`}
            className="inline-block rounded-xl border-2 border-slate-900 px-6 py-3 text-lg font-semibold">
            Open the results dashboard
          </a>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Build the dashboard charts**

Create `components/DashboardCharts.tsx`:

```tsx
'use client'

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { histogram, INCOME_BUCKETS } from '@/lib/stats'
import type { SubmissionRow } from '@/lib/db'
import { usd } from '@/lib/format'

export function DashboardCharts({ rows }: { rows: SubmissionRow[] }) {
  const incomes = rows.map(r => Number(r.desired_income))
  const buckets = histogram(incomes, INCOME_BUCKETS)
  const scatter = rows.map(r => ({
    x: Number(r.retirement_age),
    y: Number(r.first_contribution),
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border-2 border-slate-300 bg-white p-6">
        <h2 className="text-2xl font-bold text-slate-800">
          What the class wants to live on
        </h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="label" fontSize={18} />
              <YAxis allowDecimals={false} fontSize={18} width={40} />
              <Tooltip />
              <Bar dataKey="count" name="Students" fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-300 bg-white p-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Retire earlier, save more
        </h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis type="number" dataKey="x" name="Retirement age"
                domain={['dataMin - 2', 'dataMax + 2']} fontSize={18} />
              <YAxis type="number" dataKey="y" name="Monthly"
                tickFormatter={v => usd(v)} fontSize={18} width={80} />
              <ZAxis range={[120, 120]} />
              <Tooltip formatter={(v: number, n) => n === 'Monthly' ? usd(v) : v} />
              <Scatter data={scatter} fill="#1d4ed8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 8: Build the dashboard page**

Create `app/d/[code]/page.tsx`:

```tsx
'use client'

import { use, useEffect, useState } from 'react'
import type { SubmissionRow } from '@/lib/db'
import { median } from '@/lib/stats'
import { usd } from '@/lib/format'
import { DashboardCharts } from '@/components/DashboardCharts'

export default function DashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [rows, setRows] = useState<SubmissionRow[]>([])

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/sessions/${code}/results`)
      if (res.ok) setRows((await res.json()).submissions)
    }
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [code])

  const incomes = rows.map(r => Number(r.desired_income))
  const contributions = rows.map(r => Number(r.first_contribution))
  const stat = (label: string, value: string) => (
    <div key={label} className="rounded-2xl border-2 border-slate-300 bg-white p-6">
      <p className="text-lg text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-4xl font-bold text-slate-900">Class results</h1>
        <p className="font-mono text-3xl font-bold tracking-widest text-slate-500">{code}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat('Responses', String(rows.length))}
        {stat('Median target income', usd(median(incomes)))}
        {stat('Median monthly saving', usd(median(contributions)))}
        {stat('Range of targets', rows.length
          ? `${usd(Math.min(...incomes))} - ${usd(Math.max(...incomes))}`
          : '-')}
      </div>

      {rows.length === 0 ? (
        <p className="py-24 text-center text-3xl text-slate-400">
          Waiting for the first response...
        </p>
      ) : (
        <DashboardCharts rows={rows} />
      )}
    </main>
  )
}
```

- [ ] **Step 9: Verify end to end**

Run `npm run dev`. Open `/instructor`, start a session, and confirm the QR renders and the code is legible at arm's length. Scan it with a phone on the same network (or open `/s/<CODE>` in a second browser). Submit from two different browsers and confirm the dashboard reaches 2 responses within about four seconds. Submit twice from the same browser and confirm the count stays put.

- [ ] **Step 10: Commit**

```bash
git add app/d app/instructor app/api/sessions components/DashboardCharts.tsx lib/stats.ts lib/stats.test.ts
git commit -m "feat: instructor session launcher and live class dashboard"
```

---

### Task 9: Module 2 rent vs buy explorer

**Files:**
- Create: `app/rentbuy/page.tsx`
- Create: `components/RentBuyCharts.tsx`
- Create: `components/SliderRow.tsx`
- Create: `components/Callout.tsx`

**Interfaces:**
- Consumes: `simulateRentBuy`, `PRESETS`, `DOWN_PAYMENT_PRESETS`, types `RentBuyInput` and `RentBuyResult` from `lib/mortgage.ts`; `usd` from `lib/format.ts`.
- Produces: `SliderRow` (props `{ label, value, min, max, step, format, onChange }`), `Callout` (props `{ title, children }`), `RentBuyCharts` (props `{ input, result }`).

- [ ] **Step 1: Build the slider and callout**

Create `components/SliderRow.tsx`:

```tsx
'use client'

export function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  format: (n: number) => string; onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-base text-slate-600">{label}</span>
        <span className="text-lg font-semibold tabular-nums text-slate-900">{format(value)}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-slate-900" />
    </label>
  )
}
```

Create `components/Callout.tsx`:

```tsx
export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
      <h3 className="text-lg font-bold text-amber-900">{title}</h3>
      <p className="mt-1 text-base leading-relaxed text-amber-900/80">{children}</p>
    </div>
  )
}
```

- [ ] **Step 2: Build the charts**

Create `components/RentBuyCharts.tsx`:

```tsx
'use client'

import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { RentBuyInput, RentBuyResult } from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

export function RentBuyCharts({ input, result }: { input: RentBuyInput; result: RentBuyResult }) {
  const yearly = result.rows.filter(r => r.month % 12 === 0)
  const data = yearly.map(r => ({
    year: r.month / 12,
    pi: r.pi,
    rent: r.rent,
    buyerOutlay: r.buyerOutlay,
    renterOutlay: r.renterOutlay,
    buyer: r.buyerNetWorth,
    renter: r.renterNetWorth,
    principal: r.principal,
    interest: r.interest,
  }))
  const beYear = result.breakevenMonth ? result.breakevenMonth / 12 : null

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartFrame title="Fixed payment vs rising rent"
        note={`P&I never moves. Rent compounds at ${(input.rentIncreasePct * 100).toFixed(1)}% a year.`}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={y => `Year ${y}`} />
            <Legend />
            <Line dataKey="pi" name="Mortgage P&I" stroke="#1d4ed8" dot={false} strokeWidth={3} />
            <Line dataKey="rent" name="Rent" stroke="#b91c1c" dot={false} strokeWidth={3} />
            <Line dataKey="buyerOutlay" name="Buyer, all in" stroke="#1d4ed8"
              dot={false} strokeDasharray="4 4" />
            <Line dataKey="renterOutlay" name="Renter, all in" stroke="#b91c1c"
              dot={false} strokeDasharray="4 4" />
            {result.outlayCrossingMonth && (
              <ReferenceLine x={Math.round(result.outlayCrossingMonth / 12)}
                stroke="#0f172a" strokeDasharray="2 2"
                label={{ value: 'All-in costs cross', position: 'top', fontSize: 12 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Where each payment goes"
        note="Early payments are almost all interest. It reverses, slowly.">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={y => `Year ${y}`} />
            <Legend />
            <Area dataKey="interest" stackId="1" name="Interest"
              stroke="#b91c1c" fill="#fecaca" />
            <Area dataKey="principal" stackId="1" name="Principal"
              stroke="#15803d" fill="#bbf7d0" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Net worth, both paths"
        note={beYear ? `Buying pulls ahead in year ${beYear.toFixed(1)}.`
                     : 'Buying never pulls ahead with these settings.'}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={y => `Year ${y}`} />
            <Legend />
            <Line dataKey="buyer" name="Buyer" stroke="#1d4ed8" dot={false} strokeWidth={3} />
            <Line dataKey="renter" name="Renter" stroke="#b91c1c" dot={false} strokeWidth={3} />
            {beYear && (
              <ReferenceLine x={Math.round(beYear)} stroke="#0f172a"
                label={{ value: 'Breakeven', position: 'top', fontSize: 12 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Money gone vs money kept"
        note="Interest, tax, insurance and maintenance are consumed. Principal is retained.">
        <ResponsiveContainer>
          <AreaChart data={yearly.map((r, idx) => {
            const upto = result.rows.slice(0, (idx + 1) * 12)
            const gone = upto.reduce(
              (s, x) => s + x.interest + x.pmi +
                (x.homeValue * (input.taxPct + input.maintPct + input.insPct)) / 12, 0)
            return { year: r.month / 12, gone, kept: r.equity }
          })}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={y => `Year ${y}`} />
            <Legend />
            <Area dataKey="gone" name="Spent and gone" stroke="#b91c1c" fill="#fecaca" />
            <Area dataKey="kept" name="Equity retained" stroke="#15803d" fill="#bbf7d0" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
```

- [ ] **Step 3: Build the explorer page**

Create `app/rentbuy/page.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import {
  simulateRentBuy, PRESETS, DOWN_PAYMENT_PRESETS, type RentBuyInput,
} from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { SliderRow } from '@/components/SliderRow'
import { Callout } from '@/components/Callout'
import { RentBuyCharts } from '@/components/RentBuyCharts'

const pctFmt = (n: number) => `${(n * 100).toFixed(2)}%`
const money = (n: number) => usd(n)

export default function RentBuyPage() {
  const [presetName, setPresetName] = useState<'fortMyers' | 'national'>('fortMyers')
  const [input, setInput] = useState<RentBuyInput>(PRESETS.fortMyers)

  const set = <K extends keyof RentBuyInput>(k: K) => (v: RentBuyInput[K]) =>
    setInput(prev => ({ ...prev, [k]: v }))

  const usePreset = (name: 'fortMyers' | 'national') => {
    setPresetName(name)
    setInput(PRESETS[name])
  }

  const result = useMemo(() => simulateRentBuy(input), [input])
  const be = result.breakevenMonth
  const threeYear = result.rows[35]

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-bold text-slate-900">Rent or buy?</h1>
        <div className="flex gap-2">
          {([['fortMyers', 'Fort Myers'], ['national', 'National']] as const).map(([k, label]) => (
            <button key={k} onClick={() => usePreset(k)}
              className={`rounded-xl border-2 px-5 py-2 text-lg font-semibold ${
                presetName === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-white">
        <p className="text-xl text-slate-300">Buying pulls ahead of renting after</p>
        <p className="mt-1 text-6xl font-bold tabular-nums">
          {be ? `${(be / 12).toFixed(1)} years` : 'never'}
        </p>
        <p className="mt-2 text-lg text-slate-300">
          {be
            ? `Sell before then and you lose. At three years you are ${usd(Math.abs(threeYear.buyerNetWorth - threeYear.renterNetWorth))} behind.`
            : 'With these settings the renter who invests the difference stays ahead for all 30 years.'}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-base text-slate-600">Down payment</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DOWN_PAYMENT_PRESETS.map(d => (
                <button key={d} onClick={() => set('downPct')(d)}
                  className={`rounded-lg border px-1 py-2 text-sm font-semibold ${
                    input.downPct === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'
                  }`}>
                  {d * 100}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-base text-slate-600">Term</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[15, 30].map(t => (
                <button key={t} onClick={() => set('termYears')(t)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                    input.termYears === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'
                  }`}>
                  {t} years
                </button>
              ))}
            </div>
          </div>

          <SliderRow label="Home price" value={input.price} min={150000} max={800000}
            step={10000} format={money} onChange={set('price')} />
          <SliderRow label="Mortgage rate" value={input.rate} min={0.03} max={0.1}
            step={0.0005} format={pctFmt} onChange={set('rate')} />
          <SliderRow label="Starting rent" value={input.startingRent} min={1000} max={5000}
            step={50} format={money} onChange={set('startingRent')} />
          <SliderRow label="Rent increase" value={input.rentIncreasePct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('rentIncreasePct')} />
          <SliderRow label="Home appreciation" value={input.apprPct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('apprPct')} />
          <SliderRow label="Investment return" value={input.investReturn} min={0.02} max={0.12}
            step={0.0025} format={pctFmt} onChange={set('investReturn')} />
          <SliderRow label="Insurance, % of value" value={input.insPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('insPct')} />
          <SliderRow label="Property tax" value={input.taxPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('taxPct')} />
          <SliderRow label="Maintenance" value={input.maintPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('maintPct')} />
          <SliderRow label="HOA" value={input.hoaMonthly} min={0} max={800}
            step={25} format={money} onChange={set('hoaMonthly')} />
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Cash to close', usd(result.upfront)],
              ['Monthly P&I, fixed', usd(result.monthlyPI)],
              ['Total interest, 30 yrs', usd(result.totalInterest)],
              ['Rent in year 30', usd(result.rows[359].rent)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <RentBuyCharts input={input} result={result} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Callout title="This model favors the renter">
              It assumes the renter invests every dollar of the difference, every month,
              at {pctFmt(input.investReturn)}. Almost nobody actually does that. A mortgage
              is forced savings; rent is 100% consumed.
            </Callout>
            <Callout title="Payment lock-in">
              Principal and interest never move for {input.termYears} years. Tax, insurance
              and maintenance still rise with the home&apos;s value, and rent rises fastest
              of all: {usd(input.startingRent)} today becomes {usd(result.rows[359].rent)} by year 30.
            </Callout>
            <Callout title="Transaction costs punish short holds">
              You pay {pctFmt(input.closingBuyPct)} to buy and {pctFmt(input.closingSellPct)} to
              sell. That is why the breakeven year matters far more than the 30-year figure.
            </Callout>
            <Callout title="Equity is accessible capital">
              By year 10 you hold {usd(result.rows[119].equity)} in equity, which a HELOC or
              cash-out refinance can put to work. Borrowing against your home also puts your
              home at risk.
            </Callout>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify in the browser**

Open `/rentbuy` at 1920x1080. Confirm the Fort Myers preset shows breakeven 5.7 years, cash to close $80,500, P&I $1,798, total interest $367,101. Switch to National and confirm 6.2 years. Drag appreciation to 2% and confirm the headline moves to about 9.3 years and the reference line on the net-worth chart moves with it. Drag the mortgage rate to 8% and confirm about 9.8 years. Confirm all text is readable from across a room.

- [ ] **Step 5: Commit**

```bash
git add app/rentbuy components/RentBuyCharts.tsx components/SliderRow.tsx components/Callout.tsx
git commit -m "feat: Module 2 rent vs buy explorer with dual presets"
```

---

### Task 10: Landing page, README, spec reconciliation

**Files:**
- Modify: `app/page.tsx`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-08-30-tvm-teaching-tools-design.md`

**Interfaces:**
- Consumes: everything prior.
- Produces: no new code interfaces.

- [ ] **Step 1: Build the landing page**

Replace `app/page.tsx`:

```tsx
import Link from 'next/link'

const links = [
  { href: '/instructor', title: 'Module 1: Retirement calculator',
    body: 'Start a class session, show the QR code, watch answers arrive live.' },
  { href: '/rentbuy', title: 'Module 2: Rent vs buy',
    body: 'Instructor-driven sliders. Find the breakeven year, then move it.' },
]

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900">Time Value of Money</h1>
      <p className="mt-2 text-lg text-slate-600">Business Mathematics teaching tools.</p>
      <div className="mt-10 space-y-4">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="block rounded-2xl border-2 border-slate-200 p-6 hover:border-slate-900">
            <h2 className="text-2xl font-semibold text-slate-900">{l.title}</h2>
            <p className="mt-1 text-slate-600">{l.body}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write the README**

Create `README.md` covering: what the two modules are, the classroom workflow for each, `npm install` / `npm run dev` / `npm test`, the `DATABASE_URL` requirement and that only Module 1 needs it, how to apply `db/schema.sql`, and a "before each semester" checklist listing the three rates to re-verify (mortgage against Freddie Mac PMMS, retirement return against the 1-year Treasury, local rent and insurance against current listings) with a pointer to `lib/assumptions.ts` and `lib/mortgage.ts` as the only two files to edit.

- [ ] **Step 3: Reconcile the spec with what was built**

Two deliberate deviations were introduced during implementation. Edit the spec so it describes the shipped system:

1. **Section 7.2 trust boundary.** Replace the paragraph accepting client-computed outputs. The submit route recomputes with `solveRetirement` server-side, since the route runs in Node and imports the solver directly, so no duplication exists. Stored figures are authoritative.
2. **Section 5.7 dashboard read access.** Note that results are readable by session code without the instructor token; the code is public on the projector and the data is anonymous by construction, so token-gating reads would add friction without protecting anything. The token still gates session closure.

- [ ] **Step 4: Run the full suite and build**

```bash
npm test && npm run build
```

Expected: all suites pass, build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: landing page, README and spec reconciliation"
```

---

## Self-Review

**Spec coverage.** Section 4 shared config → Task 1. Section 5.2 calculation → Task 2. Section 5.3 employer match → Task 2 (solver) and Task 6 (UI). Section 5.4 display order → Task 6. Section 5.5 charts → Task 7. Section 5.6 golden values → Task 2. Section 5.7 aggregation → Tasks 4, 5, 8. Section 6.1 dual presets → Task 3 (data) and Task 9 (toggle). Section 6.2 comparison mechanic → Task 3. Section 6.3 non-crossing consequence → Task 9 chart 1, which plots P&I, rent, and both all-in lines with the outlay crossing marked. Section 6.4 charts → Task 9. Section 6.5 callouts → Task 9. Section 6.6 golden values → Task 3. Section 7 architecture → Tasks 1, 4, 5. Section 7.1 data model → Task 4. Section 7.2 trust boundary → Task 5, improved and reconciled in Task 10. Section 7.3 testing → Tasks 2, 3. No gaps.

**Placeholders.** None. Every code step carries runnable code. Task 10 Step 2 describes README contents rather than showing prose, which is acceptable because it is documentation, not code, and the required contents are enumerated.

**Type consistency.** `RetirementInput` and `RetirementResult` field names match between Task 2, Task 6, and Task 7. `RentBuyInput` field names match between Task 3 and Task 9, including the `insPct` / `taxPct` / `maintPct` trio used in the Task 9 stacked-area computation. `SubmissionRow` column names are snake_case throughout Tasks 4, 5, and 8, matching the SQL. `simulateRentBuy` returns `breakevenMonth` and `outlayCrossingMonth` as nullable, and every consumer null-checks them. `getDeviceHash(code)` takes the session code in both its definition (Task 6 Step 1) and its call site (Task 6 Step 3).
