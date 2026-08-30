# Time Value of Money Teaching Tools

Two web tools for a first-semester Business Mathematics course at FGCU.

- **Module 1, Retirement calculator.** Student-facing and mobile-first, reached by QR code during lecture. Anonymous submissions aggregate to a live instructor dashboard.
- **Module 2, Rent vs buy explorer.** Instructor-driven from the front with sliders. Surfaces a breakeven year and lets you move it. No database, no poll.

## Running it

```bash
npm install
npm run dev
```

Module 2 and all the math run with no configuration. Only Module 1's class aggregation needs a database.

```bash
npm test        # 88 tests, including every published worked example
npm run build
```

## Database

Module 1 stores submissions in Neon Postgres. Put the pooled connection string in `.env.local`:

```
DATABASE_URL=postgresql://...
```

Apply `db/schema.sql` once, either from the Neon SQL Editor or with:

```bash
node --env-file=.env.local -e "const{neon}=require('@neondatabase/serverless');const fs=require('fs');const sql=neon(process.env.DATABASE_URL);(async()=>{for(const s of fs.readFileSync('db/schema.sql','utf8').split(';').map(x=>x.trim()).filter(Boolean))await sql.query(s);console.log('schema applied')})()"
```

Nothing personally identifying is collected or stored: no names, no student IDs, no emails, no IP addresses. Submissions carry three inputs, a match rate, three computed outputs, and a per-session browser token used only to stop one student submitting thirty times.

## Classroom workflow

**Module 1.** Open `/instructor` and press "Start a class session". Project the QR code and the six-character code. Students scan, adjust three inputs, and press send. Open `/d/<CODE>` for the live dashboard; it refreshes every four seconds.

The three moments land in a fixed order and the UI enforces it: the inflated income first, then the lump sum, then the monthly contribution. Do not reorder them. The first two numbers are supposed to be alarming so the third one feels like relief.

**Module 2.** Open `/rentbuy`. Take a hands-up straw poll first ("who thinks renting is smarter?"), then let the tool answer. Start on the Fort Myers preset, then switch to National to show the same decision flipping on local assumptions. The point is that the breakeven moves, not that either side wins.

## Before each semester

Three numbers go stale. All three live in exactly two files.

| Assumption | Check against | Edit in |
|---|---|---|
| Retirement return, 4.0% | 1-year Treasury, Fed H.15 | `lib/assumptions.ts` |
| Mortgage rate, 6.65% | Freddie Mac PMMS 30-year | `lib/assumptions.ts` |
| Rent and insurance | Local listings, current premiums | `lib/mortgage.ts` presets |

Last verified 2026-08-30: 1-year Treasury 4.02%, Freddie Mac 30-year 6.66%, Fort Myers median sale price $348K.

After changing any of them, run `npm test`. The Module 2 suite asserts that both presets still break even inside the 5 to 8 year window, which is the constraint that makes the module teachable. If that test fails, the defaults need retuning, not the test.

Rent-to-price ratio is the lever that controls breakeven, not the mortgage rate. At $1,800/mo against a $350K home, buying never breaks even at any rate from 6% to 7.5%. At $2,200 it breaks even at 6.2 years. Every $100/mo of rent moves breakeven roughly a year in that range.

## Layout

```
lib/assumptions.ts   shared rates, imported by both modules so they cannot drift
lib/retirement.ts    Module 1 solver, pure functions
lib/mortgage.ts      amortization, PMI, net-worth simulation, both presets
lib/stats.ts         median and histogram for the dashboard
lib/db.ts            Neon access, lazy so the app runs without it

app/s/[code]         student calculator
app/d/[code]         instructor dashboard
app/instructor       session launcher and QR code
app/rentbuy          Module 2
app/api              session create/close/results, submission
```

`docs/superpowers/specs/` holds the design doc, including why the source PRD's Module 2 defaults were retuned. `docs/verification/` holds the throwaway models that produced the evidence.
