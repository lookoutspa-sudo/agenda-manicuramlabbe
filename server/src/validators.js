import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  clientName: z.string().min(2).max(120),
  phone: z.string().min(6).max(40),
  email: z.string().email().optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional().or(z.literal("")),
  whatsappConsent: z.boolean().optional(),
});

export const serviceSchema = z.object({
  id: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  durationMinutes: z.coerce.number().int().positive().max(480),
  priceClp: z.coerce.number().int().nonnegative().max(1000000),
  imageUrl: z.string().url(),
  isActive: z.boolean().optional(),
});

export const servicePatchSchema = serviceSchema.omit({ id: true }).partial();

export const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

export function parseOrError(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { ok: false, errors: result.error.flatten() };
  }
  return { ok: true, data: result.data };
}
