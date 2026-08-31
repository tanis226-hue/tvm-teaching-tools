import Link from 'next/link'

const forStudents = [
  {
    href: '/retirement',
    title: 'Retirement calculator',
    body: 'What retirement actually costs, and what you would need to save each month to get there. Nothing is saved or sent.',
  },
  {
    href: '/rentbuy',
    title: 'Rent or buy?',
    body: 'Move the sliders and watch the breakeven year move with them. There is no single right answer, which is the point.',
  },
]

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Time Value of Money</h1>
      <p className="mt-3 text-lg text-slate-600">
        Two calculators for Business Mathematics. Free, no sign-in, and yours to keep using
        after the lecture ends.
      </p>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Explore on your own
      </h2>
      <div className="mt-4 space-y-4">
        {forStudents.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-brand hover:shadow-md"
          >
            <h3 className="text-2xl font-semibold text-slate-900">{l.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-600">{l.body}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-slate-500">
        For instructors
      </h2>
      <div className="mt-4">
        <Link
          href="/instructor"
          className="block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-brand hover:shadow-md"
        >
          <h3 className="text-2xl font-semibold text-slate-900">Start a class session</h3>
          <p className="mt-2 leading-relaxed text-slate-600">
            Project a QR code, let students send in their answers anonymously, and watch the
            spread build live on the dashboard.
          </p>
        </Link>
      </div>
    </main>
  )
}
