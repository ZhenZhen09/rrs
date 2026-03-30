import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().min(1, 'Address is required'),
  businessName: z.string().optional().nullable(),
  landmarks: z.string().optional().nullable()
});

export const createRequestSchema = z.object({
  requester_id: z.string().min(1),
  requester_name: z.string().min(1),
  requester_department: z.string().min(1),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time_window: z.string().min(1, 'Time window is required'),
  pickup_location: locationSchema,
  dropoff_location: locationSchema,
  pickup_contact_name: z.string().optional().nullable(),
  pickup_contact_mobile: z.string().optional().nullable(),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_contact: z.string().optional(),
  request_type: z.string().min(1, 'Request type is required'),
  urgency_level: z.string().min(1, 'Urgency level is required'),
  on_behalf_of: z.string().optional(),
  personnel_instructions: z.string().optional(),
  admin_remark: z.string().optional()
});

export const approveRequestSchema = z.object({
  rider_id: z.string().min(1, 'Rider ID is required'),
  admin_remark: z.string().optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'arrived', 'completed', 'failed'], {
    message: "Invalid delivery status"
  }),
  remark: z.string().optional(),
  current_lat: z.number().optional(),
  current_lng: z.number().optional(),
  timestamp: z.string().optional()
});
