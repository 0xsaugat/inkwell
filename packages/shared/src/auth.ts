import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128
export const NAME_MAX_LENGTH = 80

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email())

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`)

export const signUpInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
})

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
})

export type SignUpInput = z.infer<typeof signUpInputSchema>
export type SignInInput = z.infer<typeof signInInputSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>

export type PublicUser = {
  id: string
  name: string
  email: string
}

export type SessionPayload = {
  user: PublicUser
  csrfToken: string
  expiresAt: string
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
