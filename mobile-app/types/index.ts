export interface Job {
  request_id: string;
  requester_name: string;
  delivery_date: string;
  time_window: string;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff_location: {
    lat: number;
    lng: number;
    address: string;
  };
  pickup_contact_name?: string;
  pickup_contact_mobile?: string;
  recipient_name: string;
  recipient_contact: string;
  urgency_level: string;
  status: string;
  delivery_status: string;
  assigned_rider_id: string;
  request_type: string;
  requester_department?: string;
  personnel_instructions?: string;
  admin_remark?: string;
  rider_remark?: string;
}
