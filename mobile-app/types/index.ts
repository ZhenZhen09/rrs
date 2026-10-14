export interface Job {
  request_id: string;
  created_at?: string;
  requester_name: string;
  delivery_date: string;
  time_window: string;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
    businessName?: string;
    landmarks?: string;
  };
  dropoff_location: {
    lat: number;
    lng: number;
    address: string;
    businessName?: string;
    landmarks?: string;
  };
  pickup_contact_name?: string;
  pickup_contact_mobile?: string;
  recipient_name: string;
  recipient_contact: string;
  urgency_level: string;
  status: string;
  delivery_status?: string;
  completed_at?: string;
  assigned_rider_id: string;
  queue_order?: number;
  request_type: string;
  requester_department?: string;
  personnel_instructions?: string;
  admin_remark?: string;
  rider_remark?: string;
  is_overdue?: boolean;
  state?: 'Normal' | 'At Risk' | 'Overdue';
  scheduled_end_at?: string | null;
  remaining_minutes?: number;
  overdue_minutes?: number;
  overdue_label?: string;
  overdue_reason?: 'past_due' | 'end_of_day' | null;
  recommended_action?: 'contact_rider' | 'track_rider' | 'check_signal' | null;
  current_location?: {
    lat: number;
    lng: number;
    source?: string;
    updated_at?: string;
  } | null;
  dropoff_address?: string;
}
