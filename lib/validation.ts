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

export const MAX_SESSION_LABEL = 60

// An instructor types this and it renders on a lecture-hall projector. React
// escapes the value, so this is about layout rather than injection: collapse
// control characters and whitespace runs so a pasted newline cannot push the
// header open, and cap the length so a long name cannot crowd out the page.
export function normalizeSessionLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const clean = raw
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SESSION_LABEL)
  return clean.length > 0 ? clean : null
}
