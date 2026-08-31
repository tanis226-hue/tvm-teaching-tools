# Time Value of Money Teaching Tools

**Live: https://tvm-tools.netlify.app**

| | |
|---|---|
| Retirement calculator (students, anytime) | https://tvm-tools.netlify.app/retirement |
| Rent vs buy (students and projector) | https://tvm-tools.netlify.app/rentbuy |
| Start a class session (instructor) | https://tvm-tools.netlify.app/instructor |
| Netlify admin | https://app.netlify.com/projects/tvm-tools |
| Neon project | `tvm-teaching-tools`, region `aws-us-east-1` |

Two web tools for a first-semester Business Mathematics course at FSW (Florida SouthWestern State College). Free to use, no sign-in, nothing to install.

- **Module 1, Retirement calculator.** Student-facing and mobile-first. During a lecture it is reached by QR code and can send an anonymous answer to a live instructor dashboard. Outside of a lecture, `/retirement` is the same calculator with the submit step removed, so a student can revisit it any time.
- **Module 2, Rent vs buy explorer.** Slider-driven. Surfaces a breakeven year and lets you move it. No database, no session, so students can open it directly too.

Both student-facing pages are static and hit no database. Only the class-session flow (`/instructor`, `/s/[code]`, `/d/[code]`) needs `DATABASE_URL`.

## Running it

```bash
npm install
npm run dev
```

Module 2 and all the math run with no configuration. Only Module 1's class aggregation needs a database.

```bash
npm test        # 117 tests: published worked examples plus model constraints
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

**Module 2.** Open `/rentbuy`. Take a hands-up straw poll first ("who thinks renting is smarter?"), then let the tool answer. It opens on **National**, which breaks even at 9.3 years and gives the class a working baseline. Then switch to **Fort Myers**, where with sourced Lee County numbers it never breaks even. The contrast is the lesson: same arithmetic, same decision, different answer because of where you live.

**Afterwards.** Point students at `/retirement` and `/rentbuy` directly. Both work with no session code, no sign-in, and nothing saved, so they can keep playing with the numbers on their own. The retirement page in practice mode is the identical calculator with only the "send to class" step removed, so the figures they get at home match the lecture exactly.

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
| Household budget | $3,300 NAT / $3,600 FM | the buyer's month-1 outlay, rounded up | `lib/mortgage.ts` |

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
- The renter's year-50 net worth must be unmoved by any buyer-side recurring cost.
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
the return to about 6.5% for the after-tax version. And it assumes both households save
every spare dollar of the budget every month and never spend it, which almost nobody does.

**How the comparison is kept fair.** Both households live on the same monthly budget for
housing plus saving, and each invests whatever housing does not consume. That matters:
under the earlier rule the renter's saving was defined as the buyer's outlay minus their
own, so raising a buyer cost handed the renter money. An $800/mo HOA on a house the renter
does not live in made them $5.2M richer by year 50. Now the renter's result depends only on
renter-side inputs, and a rate rise instead shows up as months the buyer cannot afford.

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

`docs/superpowers/specs/` holds the design doc: what the tool does now, and a changelog of the three model corrections and why each mattered. The original implementation plan and the throwaway verification scripts were deleted once they went stale; they are in git history if the reasoning is ever needed.
