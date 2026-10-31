import { z } from 'zod'

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'down']),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
})

export type Health = z.infer<typeof healthSchema>
