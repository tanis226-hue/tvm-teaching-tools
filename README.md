# Time Value of Money Teaching Tools

**Live: https://tvm-tools.netlify.app**

| | |
|---|---|
| Start a class session | https://tvm-tools.netlify.app/instructor |
| Rent vs buy (projector) | https://tvm-tools.netlify.app/rentbuy |
| Netlify admin | https://app.netlify.com/projects/tvm-tools |
| Neon project | `tvm-teaching-tools`, region `aws-us-east-1` |

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

## Deployment

Hosted on Netlify, database on Neon. `DATABASE_URL` is set as a Netlify environment
variable for the production, deploy-preview and branch-deploy contexts; it is not in the
repo. To redeploy from this machine:

```bash
netlify deploy --build          # preview URL, smoke-test this first
netlify deploy --build --prod   # promote to tvm-tools.netlify.app
```

Node is pinned to 24 via `.nvmrc`. There is no `netlify.toml`: Netlify auto-detects
Next.js and provisions the OpenNext adapter, and restating the defaults would only create
drift. Do **not** use Netlify's "add a database" button; it provisions a separate database
under a different variable name and every Module 1 route would start returning 500s while
the build stays green.

## Database

Module 1 stores submissions in Neon Postgres. Put the pooled connection string in `.env.local`:

```
DATABASE_URL=postgresql://...
```

Apply `db/schema.sql` once, either from the Neon SQL Editor or with:

```bash
node --env-file=.env.local -e "const{neon}=require('@neondatabase/serverless');const fs=require('fs');const sql=neon(process.env.DATABASE_URL);(async()=>{for(const s of fs.readFileSync('db/schema.sql','utf8').split(';').map(x=>x.trim()).filter(Boolean))await sql.query(s);console.log('schema applied')})()"
```

Nothing personally identifying is collected or stored: no names, no student IDs, no emails,
no IP addresses. Submissions carry three inputs, a match rate and three computed outputs.

A per-session browser id in `localStorage` discourages accidental double-submits from the
same phone; it is not a real identity check, since the value is client-supplied. The actual
flood protection is the 300-row cap per session in `lib/db.ts` plus the four-hour write
window in `app/api/submit/route.ts`. `device_hash` is never returned by the results
endpoint: it is the upsert conflict key, so publishing it would hand out a write key for
every student's row.

## Running a session safely

- The dashboard polls every 8 seconds, pauses while its tab is hidden, and stops after
  three hours with a Resume button. That cap exists because Neon's free tier is 100
  CU-hours a month and a forgotten projector tab would exhaust it in about two weeks,
  which suspends the database and takes Module 1 down until the next billing period.
- Keep the `/instructor` tab open during class. It holds the instructor token in
  `sessionStorage`, which is what makes the dashboard's **Close session** button work.
  Closing a session is permanent; there is no reopen path.
- Sessions stop accepting submissions four hours after creation, so an old code cannot be
  written to later in the term.

## Classroom workflow

**Module 1.** Open `/instructor` and press "Start a class session". Project the QR code and the six-character code. Students scan, adjust three inputs, and press send. Open `/d/<CODE>` for the live dashboard; it refreshes every eight seconds. The dashboard also carries the **Close session** button, which only appears while the `/instructor` tab that created the session is still open.

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
