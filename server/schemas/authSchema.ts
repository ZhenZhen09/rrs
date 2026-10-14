import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['personnel', 'rider'], {
    message: "Role must be 'personnel' or 'rider'"
  })
}).refine((value) => value.email.toLowerCase() !== 'admin@company.com', {
  message: 'This email is reserved for the system administrator',
  path: ['email'],
});
