import { User, DeliveryRequest, Notification } from '../types';

// Mock Users Database
export const mockUsers: User[] = [
  {
    id: 'admin_001',
    email: 'admin@company.com',
    name: 'Sarah Admin',
    role: 'admin',
  },
  {
    id: 'personnel_001',
    email: 'john.hr@company.com',
    name: 'John Smith',
    role: 'personnel',
    department: 'Human Resources',
  },
  {
    id: 'personnel_002',
    email: 'jane.finance@company.com',
    name: 'Jane Doe',
    role: 'personnel',
    department: 'Finance',
  },
  {
    id: 'rider_001',
    email: 'rider1@company.com',
    name: 'Mike Rider',
    role: 'rider',
  },
  {
    id: 'rider_002',
    email: 'rider2@company.com',
    name: 'Anna Transport',
    role: 'rider',
  },
];

// Mock Delivery Requests
export const mockRequests: DeliveryRequest[] = [
  {
    request_id: 'req_001',
    requester_id: 'personnel_001',
    requester_name: 'John Smith',
    requester_department: 'Human Resources',
    created_at: '2026-02-27T09:30:00Z',
    delivery_date: '2026-03-03',
    time_window: '09:00 - 10:00',
    request_type: 'Delivery/Pickup',
    urgency_level: 'High',
    pickup_location: {
      lat: 14.1625,
      lng: 121.2619,
      address: 'CARD MRI Development Institute, F. T. San Luis Road, Tranca, Bay, Laguna, Calabarzon, 4033, Philippines',
    },
    dropoff_location: {
      lat: 14.0717,
      lng: 121.3250,
      address: 'CARD MRI Information Technology Inc. (CMIT), P. Burgos Street, VII-D, San Pablo, Laguna, Calabarzon, 4000, Philippines',
    },
    recipient_name: 'Maria Santos',
    recipient_contact: '+63 912 345 6789',
    status: 'approved',
    assigned_rider_id: 'rider_001',
    assigned_rider_name: 'Mike Rider',
    delivery_status: 'in_progress',
  },
  {
    request_id: 'req_002',
    requester_id: 'personnel_002',
    requester_name: 'Jane Doe',
    requester_department: 'Finance',
    created_at: '2026-02-28T10:15:00Z',
    delivery_date: '2026-03-02',
    time_window: '14:00 - 15:00',
    request_type: 'Bank Transaction',
    urgency_level: 'Urgent',
    on_behalf_of: 'Finance Director',
    pickup_location: {
      lat: 14.5995,
      lng: 120.9842,
      address: 'Main Office, Makati City, Metro Manila',
    },
    dropoff_location: {
      lat: 14.5547,
      lng: 121.0244,
      address: 'BGC Office, Taguig City, Metro Manila',
    },
    recipient_name: 'Robert Cruz',
    recipient_contact: '+63 917 234 5678',
    status: 'pending',
  },
  {
    request_id: 'req_003',
    requester_id: 'personnel_001',
    requester_name: 'John Smith',
    requester_department: 'Human Resources',
    created_at: '2026-02-28T11:45:00Z',
    delivery_date: '2026-03-05',
    time_window: '10:00 - 11:00',
    request_type: 'Countering',
    urgency_level: 'Low',
    pickup_location: {
      lat: 14.5995,
      lng: 120.9842,
      address: 'Main Office, Makati City, Metro Manila',
    },
    dropoff_location: {
      lat: 14.6760,
      lng: 121.0437,
      address: 'Supplier Warehouse, Quezon City, Metro Manila',
    },
    recipient_name: 'Lisa Reyes',
    status: 'disapproved',
    admin_remark: 'Delivery slot already fully booked. Please select alternative date.',
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif_001',
    user_id: 'admin_001',
    message: 'New delivery request from Jane Doe (Finance)',
    type: 'request_submitted',
    read: false,
    created_at: '2026-02-28T10:15:00Z',
    request_id: 'req_002',
  },
  {
    id: 'notif_002',
    user_id: 'personnel_001',
    message: 'Your delivery request for 2026-03-01 has been approved. Rider: Mike Rider',
    type: 'request_approved',
    read: false,
    created_at: '2026-02-27T14:20:00Z',
    request_id: 'req_001',
  },
  {
    id: 'notif_003',
    user_id: 'rider_001',
    message: 'New delivery assigned for 2026-03-01 at 09:00 - 10:00',
    type: 'rider_assigned',
    read: false,
    created_at: '2026-02-27T14:20:00Z',
    request_id: 'req_001',
  },
  {
    id: 'notif_004',
    user_id: 'personnel_001',
    message: 'Your delivery request for 2026-03-05 has been disapproved. Reason: Delivery slot already fully booked. Please select alternative date.',
    type: 'request_disapproved',
    read: true,
    created_at: '2026-02-28T11:50:00Z',
    request_id: 'req_003',
  },
];
