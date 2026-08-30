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
npm test        # 104 tests: published worked examples plus model constraints
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

Every default was sourced on **2026-08-30**. The three that go stale fastest are the two
market rates and the local rent.

| Assumption | Value | Source | Where |
|---|---|---|---|
| Inflation | 2.5% | CPI-U realized 1996-2026 2.56%; Phila. Fed SPF 10-yr 2.30% | `lib/assumptions.ts` |
| Mortgage rate, 30 / 15 yr | 6.66% / 5.98% | Freddie Mac PMMS, 2026-08-27 | `lib/assumptions.ts` |
| Retirement return | 4.0% | 1-year Treasury 4.04%, 2026-08-27 | `lib/assumptions.ts` |
| Investment return | 7.5% gross | Damodaran 1928-2025 10.2% nominal; Vanguard VCMM 3.9-5.9% next 10yr | `lib/assumptions.ts` |
| Home appreciation | 3.75% | FHFA 1975-2026 real 1.26%; inflation + 1.25pp | `lib/mortgage.ts` |
| Rent growth | 3.25% | BLS rent of primary residence, ~0.9pp over CPI | `lib/mortgage.ts` |
| FM price / rent | $385,000 / $2,200 | FGCU RERI Jul 2026; Zillow ZORI SFR 2026-07-31 | `lib/mortgage.ts` |
| NAT price / rent | $400,000 / $2,300 | Zillow ZORI SFR US, 2026-07-31 | `lib/mortgage.ts` |
| FM maintenance / insurance / flood | $4,200 / $3,576 / $1,975 per yr | JCHS 2025 (2023 AHS); FLOIR Jul 2026; FEMA NFIP Lee County | `lib/mortgage.ts` |
| PMI | 0.38%/yr of original loan | Enact national BPMI card, upd. 2025-07-17 | `lib/mortgage.ts` |
| Seller closing costs | 6.7% FM / 7.0% NAT | Redfin Q3 2025 commissions 5.25%; FL doc stamps + title | `lib/mortgage.ts` |

| NAT property tax | 1.00% | ATTOM 2025 Annual Property Tax Analysis, reconciled with NAHB/ACS 2024 | `lib/mortgage.ts` |
| NAT homeowners insurance | $2,000/yr | NAIC Homeowners Report (2023 data, pub. Jul 2026), HO-3 at $400k Coverage A, trended to mid-2026 | `lib/mortgage.ts` |

**Two ranges worth saying out loud in class.** Property tax: Hawaii is about a third of a
percent, Illinois and New Jersey about 1.8 to 1.9. The same $400,000 house costs $1,300 a
year in Honolulu and $7,400 in New Jersey, which moves the answer more than any other input
in the model. Insurance: at identical $400,000 dwelling coverage, Nevada averages about
$1,100 and Louisiana about $3,900. The national number is a teaching midpoint, not a fact
about anyone.

**One known bias, in the buyer's favour.** Insurance is grown at the single 2.5% inflation
dial, but NAIC measures homeowners premiums rising 2.4 to 5.3 percentage points *above*
inflation from 2018 to 2024. A truer escalation is about 4.5% nominal, worth roughly
$34,000 more over 30 years. The single dial is kept for coherence across the model; drag
insurance up if you want to show the sensitivity.

**Flood is off by default nationally, on for Fort Myers.** Only about 3 to 5% of US
households carry NFIP, against roughly 75% of Lee County single-family flood policies
sitting in a mapped zone. $0 means "no premium", not "no risk".

After changing anything, run `npm test`. The Module 2 suite asserts *constraints*, not just
values, and those are the ones that matter:

- Lifetime maintenance and insurance must be identical at 3.75% and 8% appreciation.
- Buyer net worth must increase monotonically with appreciation.
- Property tax must be the only cost that tracks market value.
- PMI must terminate and never be charged at 20% down.
- Price-to-rent must stay within 10-22x.

## What the Fort Myers preset says

With sourced 2026 inputs, **buying in Lee County does not break even within 50 years.** Not
at 20% down, not with flood excluded. The buyer pays $3,568/mo against $2,230 of rent, a
$1,338 gap sustained for 247 months, because Lee County carrying costs are 3.84% of price
per year (tax 1.30 + maintenance 1.09 + homeowners 0.93 + flood 0.51). Price-to-rent is
14.6x, mid-band for the market, so this is not an artefact of a bad rent figure.

That is why **National opens the lesson** (breakeven 9.3 years) and Fort
Myers is the second act. The contrast is the teaching moment: the same arithmetic, the same
decision, a different answer because of where you live.

Two honest caveats to raise in class if they come up. The model compares a *pre-tax*
brokerage return against a home gain that is tax-free up to $250,000 under IRC §121; drag
the return to about 6.5% for the after-tax version. And it assumes the renter invests every
dollar of the difference every month and never spends it, which almost nobody does.

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
