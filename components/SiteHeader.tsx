import Link from 'next/link'

// A lettermark, not FSW's official seal: their own licensing page restricts
// the trademarked logo to marketing-approved licensees. This uses only their
// published brand colors and mirrors the "FSW letters" variant their own
// guide lists for space-limited placements. Swap in the real asset in
// public/ and reference it here if the college supplies one.
function FswMark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-xs font-bold tracking-tight text-white sm:h-9 sm:w-9 sm:text-sm">
      FSW
    </span>
  )
}

export function SiteHeader() {
  return (
    <div className="border-b-[3px] border-accent bg-brand">
      <Link
        href="/"
        className="mx-auto flex max-w-[1600px] items-center gap-2.5 px-4 py-2 sm:gap-3 sm:px-6 sm:py-2.5"
      >
        <FswMark />
        <span className="text-sm font-semibold leading-tight text-white sm:text-base">
          Business Mathematics
        </span>
      </Link>
    </div>
  )
}
