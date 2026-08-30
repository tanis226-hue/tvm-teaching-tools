import Link from 'next/link'

const links = [
  {
    href: '/instructor',
    title: 'Module 1: Retirement calculator',
    body: 'Start a class session, show the QR code, watch answers arrive live.',
  },
  {
    href: '/rentbuy',
    title: 'Module 2: Rent vs buy',
    body: 'Instructor-driven sliders. Find the breakeven year, then move it.',
  },
]

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900">Time Value of Money</h1>
      <p className="mt-2 text-lg text-slate-600">Business Mathematics teaching tools.</p>
      <div className="mt-10 space-y-4">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-2xl border-2 border-slate-200 p-6 transition-colors hover:border-slate-900"
          >
            <h2 className="text-2xl font-semibold text-slate-900">{l.title}</h2>
            <p className="mt-1 text-slate-600">{l.body}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
