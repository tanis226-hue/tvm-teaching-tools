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
