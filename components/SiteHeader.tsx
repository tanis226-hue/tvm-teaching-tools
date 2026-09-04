import Link from 'next/link'

// Deliberately unbranded. This ships as a public tool that other courses fork,
// and a trademark licence does not travel with a fork: an institution's logo or
// seal must not be committed here. The header carries the tool's own name by
// default, and whatever class or school name an instructor typed when they
// started the session. To brand a fork, change the name below and the
// --color-brand / --color-accent tokens in app/globals.css.
export function SiteHeader({ label }: { label?: string | null }) {
  return (
    <div className="border-b-[3px] border-accent bg-brand">
      <Link
        href="/"
        className="mx-auto flex max-w-[1600px] items-center px-4 py-2 sm:px-6 sm:py-2.5"
      >
        <span className="truncate text-sm font-semibold leading-tight text-white sm:text-base">
          {label || 'Time Value of Money'}
        </span>
      </Link>
    </div>
  )
}
