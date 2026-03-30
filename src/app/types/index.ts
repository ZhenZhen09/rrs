// User Roles
export type UserRole = 'admin' | 'personnel' | 'rider';

// User Account
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string; // Only for personnel
}

// Delivery Request Status
export type RequestStatus = 'pending' | 'approved' | 'disapproved' | 'returned_for_revision';

// Delivery Status (for riders)
export type DeliveryStatus = 'assigned' | 'in_progress' | 'completed' | 'failed';

// Type of Request
export type RequestType = 
  | 'Asset Management'
  | 'Bank Transaction'
  | 'BIR Compliance'
  | 'Cash Collection'
  | 'Check Deposit / Encashment'
  | 'Check Retrieval'
  | 'Client Coordination'
  | 'Client Gifting'
  | 'Contract Retrieval'
  | 'Countering'
  | 'Delivery'
  | 'Delivery/Pickup'
  | 'Drop-off'
  | 'Fullfillment'
  | 'General Errands'
  | 'Government Compliance'
  | 'Internal Transfer'
  | 'Mandatory Benefits'
  | 'Marketing Collateral'
  | 'Messenger Transfer'
  | 'Notarization'
  | 'On-site Assistance'
  | 'Passbook / Statement Update'
  | 'Permit Processing'
  | 'Petty Cash Liquidation'
  | 'Pickup'
  | 'Purchasing / Errand'
  | 'Recruitment Logistics'
  | 'Signature Chasing'
  | 'Statutory Benefits'
  | 'Tax & Treasury'
  | 'Special Service / Others';

export const REQUEST_CATEGORIES = {
  'Logistics & Delivery': [
    'Delivery',
    'Pickup',
    'Drop-off',
    'Fullfillment',
    'Internal Transfer',
    'Messenger Transfer',
    'General Errands',
  ],
  'Financial & Banking': [
    'Bank Transaction',
    'Cash Collection',
    'Check Deposit / Encashment',
    'Check Retrieval',
    'Petty Cash Liquidation',
    'Passbook / Statement Update',
    'Tax & Treasury',
  ],
  'Compliance & Legal': [
    'BIR Compliance',
    'Government Compliance',
    'Mandatory Benefits',
    'Statutory Benefits',
    'Notarization',
    'Permit Processing',
    'Signature Chasing',
    'Contract Retrieval',
  ],
  'Client & Business': [
    'Client Coordination',
    'Client Gifting',
    'Marketing Collateral',
    'Recruitment Logistics',
    'Purchasing / Errand',
    'On-site Assistance',
    'Asset Management',
    'Countering',
  ],
  'Other': [
    'Special Service / Others',
  ]
};

export interface CategoryStyle {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CATEGORY_CONFIG: Record<RequestType, CategoryStyle> = {
  'Asset Management': { icon: 'Briefcase', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Bank Transaction': { icon: 'Banknote', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'BIR Compliance': { icon: 'ShieldCheck', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'Cash Collection': { icon: 'Wallet', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'Check Deposit / Encashment': { icon: 'CreditCard', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'Check Retrieval': { icon: 'FileText', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'Client Coordination': { icon: 'Users', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  'Client Gifting': { icon: 'Gift', color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-100' },
  'Contract Retrieval': { icon: 'FileSignature', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
  'Countering': { icon: 'ArrowLeftRight', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' },
  'Delivery': { icon: 'Truck', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Delivery/Pickup': { icon: 'Truck', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Drop-off': { icon: 'MapPin', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Fullfillment': { icon: 'PackageCheck', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'General Errands': { icon: 'Activity', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
  'Government Compliance': { icon: 'ShieldCheck', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'Internal Transfer': { icon: 'RefreshCcw', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Mandatory Benefits': { icon: 'HeartPulse', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'Marketing Collateral': { icon: 'Megaphone', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  'Messenger Transfer': { icon: 'Bike', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Notarization': { icon: 'FileCheck', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'On-site Assistance': { icon: 'HelpingHand', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  'Passbook / Statement Update': { icon: 'BookOpen', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'Permit Processing': { icon: 'ClipboardCheck', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'Petty Cash Liquidation': { icon: 'Receipt', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  'Pickup': { icon: 'Package', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  'Purchasing / Errand': { icon: 'ShoppingCart', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' },
  'Recruitment Logistics': { icon: 'UserPlus', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  'Signature Chasing': { icon: 'PenTool', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
  'Special Service / Others': { icon: 'Sparkles', color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-100' },
  'Statutory Benefits': { icon: 'ShieldPlus', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
  'Tax & Treasury': { icon: 'Calculator', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
};

// Urgency Level
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Urgent';

// Location
export interface Location {
  lat: number;
  lng: number;
  address: string;
  businessName?: string;
  landmarks?: string;
}

// Delivery Request
export interface DeliveryRequest {
  // Backend-managed fields (never shown in UI forms)
  request_id: string;
  requester_id: string;
  created_at: string;
  completed_at?: string;
  admin_remark?: string;
  personnel_instructions?: string;
  
  // User-submitted fields
  delivery_date: string;
  time_window: string;
  pickup_location: Location;
  dropoff_location: Location;
  
  // New Pickup Contact Info
  pickup_contact_name?: string;
  pickup_contact_mobile?: string;
  
  recipient_name: string;
  recipient_contact?: string;
  request_type: RequestType;
  urgency_level: UrgencyLevel;
  on_behalf_of?: string; // Optional: If someone is requesting for someone else
  
  // Status fields
  status: RequestStatus;
  assigned_rider_id?: string;
  delivery_status?: DeliveryStatus;
  rider_remark?: string;
  
  // Metadata
  requester_name?: string;
  requester_department?: string;
  assigned_rider_name?: string;
  is_optimistic?: boolean;
  exceptions?: string[];
  exception_severity?: 'warning' | 'critical';
  
  // Live Tracking coordinates
  current_lat?: number;
  current_lng?: number;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'request_submitted' | 'request_approved' | 'request_disapproved' | 'rider_assigned' | 'delivery_reminder';
  read: boolean;
  created_at: string;
  request_id?: string;
}

// Time Slots
export const TIME_SLOTS = [
  '08:00 - 08:30',
  '08:30 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 11:30',
  '11:30 - 12:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
];

// Departments
export const DEPARTMENTS = [
  'Human Resources',
  'Finance',
  'IT',
  'Marketing',
  'Operations',
  'Sales',
  'Legal',
  'Administration',
];
