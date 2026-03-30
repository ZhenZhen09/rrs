# Rider Scheduling & Delivery System

## Overview

A comprehensive delivery management system that manages delivery requests across departments, schedules riders efficiently, and ensures clear visibility, approval control, and real-time notifications.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v7 (Data Mode)
- **UI Components**: Radix UI + Custom Components
- **Styling**: Tailwind CSS v4
- **Maps**: Leaflet + React Leaflet
- **State Management**: React Context API
- **Data Persistence**: LocalStorage (Demo) - Ready for Supabase integration
- **Notifications**: Sonner Toast + In-app Notification Center

## User Roles & Capabilities

### 1. Administrator
**Access Level**: Full system oversight

**Capabilities**:
- View all delivery requests across all departments
- Approve or disapprove pending requests
- Assign riders to approved deliveries
- Add administrative remarks (backend-managed)
- View calendar of all scheduled deliveries
- Monitor delivery status and history
- Filter requests by date, department, and rider

**Dashboard Features**:
- Pending requests tab with approval controls
- Calendar view showing all scheduled deliveries
- All requests view with filtering
- Real-time statistics (pending, approved, total)

### 2. Department Personnel
**Access Level**: Department-scoped

**Capabilities**:
- Create delivery requests on behalf of their department
- View their own request history
- Track request status (Pending/Approved/Disapproved)
- View assigned rider details for approved requests
- Receive notifications on status changes

**Account Requirements**:
- Must create an account first
- Name and department are auto-fetched from database
- Cannot manually edit name or department
- All requests automatically linked to their account

**Dashboard Features**:
- Submit new delivery requests with:
  - Calendar-based date selection
  - Time window dropdown (hourly slots)
  - Map-based pickup location selection
  - Map-based drop-off location selection
  - Recipient details
- View all personal requests with status
- See approval details including assigned rider

### 3. Rider
**Access Level**: Assignment-scoped

**Capabilities**:
- View deliveries assigned to them
- See deliveries scheduled for:
  - Today
  - Tomorrow
  - Upcoming dates
- Access full delivery details:
  - Pickup location with coordinates
  - Drop-off location with coordinates
  - Recipient name and contact
  - Requesting department and personnel
  - Time window
- Update delivery status:
  - Assigned
  - In Progress
  - Completed
  - Failed
- Add delivery remarks or notes

**Dashboard Features**:
- Today's deliveries tab
- Tomorrow's deliveries tab
- Upcoming deliveries tab
- Real-time statistics
- Status update controls

## Core Modules

### 1. Authentication & Identity Management
**File**: `/src/app/context/AuthContext.tsx`

**Features**:
- Account creation for personnel and riders
- Role-based authentication
- Auto-fetch name and department from database
- Session persistence via localStorage
- Protected route access

**Demo Accounts**:
- Admin: `admin@company.com`
- Personnel: `john.hr@company.com` (Human Resources)
- Personnel: `jane.finance@company.com` (Finance)
- Rider: `rider1@company.com` (Mike Rider)
- Rider: `rider2@company.com` (Anna Transport)

### 2. Data Management
**File**: `/src/app/context/DataContext.tsx`

**Features**:
- Centralized state management
- CRUD operations for delivery requests
- Approval/disapproval workflows
- Rider assignment
- Delivery status updates
- Notification generation and management

**Backend-Only Fields** (Never exposed in UI):
- `request_id` - Auto-generated unique identifier
- `requester_id` - System-assigned user identifier
- `admin_remark` - Administrative notes (only shown to admin)
- `created_at` - System timestamp

### 3. Location Selection
**File**: `/src/app/components/MapPicker.tsx`

**Features**:
- Interactive map-based location picker
- Click-to-select functionality
- Visual marker placement
- Coordinate display
- Address storage
- Prevents free-text location entry

**Map Provider**: OpenStreetMap via Leaflet

### 4. Calendar & Scheduling
**Integration**: React Day Picker + date-fns

**Features**:
- Calendar-based date selection
- Disable past dates
- Predefined time slots (8:00 AM - 6:00 PM)
- Visual schedule view for administrators
- Grouped delivery view by date

**Time Slots**:
```
08:00 - 09:00
09:00 - 10:00
10:00 - 11:00
11:00 - 12:00
12:00 - 13:00
13:00 - 14:00
14:00 - 15:00
15:00 - 16:00
16:00 - 17:00
17:00 - 18:00
```

### 5. Notification System
**Implementation**: In-app notifications + Toast messages

**Notification Types**:
- Request submitted (to admin)
- Request approved (to personnel)
- Request disapproved (to personnel)
- Rider assigned (to rider)
- Delivery reminders (future enhancement)

**Features**:
- Unread badge counter
- Notification panel in header
- Click to mark as read
- Timestamp display
- Type-specific icons

### 6. Approval Workflow

**Process Flow**:
1. Personnel submits delivery request
2. Request appears in admin's "Pending" tab
3. Admin reviews request details
4. Admin either:
   - **Approves**: Assigns rider + optional remark
   - **Disapproves**: Adds reason (optional)
5. Personnel receives notification
6. If approved, rider receives assignment notification
7. Request status updates automatically

**Status Lifecycle**:
```
Pending → Approved → [Delivery Statuses]
        ↓
    Disapproved
```

### 7. Delivery Execution

**Rider Status Flow**:
```
Assigned → In Progress → Completed
                      ↓
                    Failed
```

**Status Updates**:
- Riders can update status at any time
- Can add notes/remarks for each update
- Updates are logged and visible to admin

## Data Structure

### User Model
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'personnel' | 'rider';
  department?: string; // Only for personnel
}
```

### Delivery Request Model
```typescript
{
  // Backend-managed (hidden from UI forms)
  request_id: string;
  requester_id: string;
  created_at: string;
  admin_remark?: string;
  
  // User-submitted
  delivery_date: string;
  time_window: string;
  pickup_location: Location;
  dropoff_location: Location;
  recipient_name: string;
  recipient_contact?: string;
  
  // Status tracking
  status: 'pending' | 'approved' | 'disapproved';
  assigned_rider_id?: string;
  delivery_status?: 'assigned' | 'in_progress' | 'completed' | 'failed';
  rider_remark?: string;
  
  // Metadata
  requester_name?: string;
  requester_department?: string;
  assigned_rider_name?: string;
}
```

### Location Model
```typescript
{
  lat: number;
  lng: number;
  address: string;
}
```

## System Rules & Constraints

### Security Rules
1. Backend controls all identifiers and timestamps
2. Frontend never exposes internal IDs in forms
3. All inputs validated server-side (in real implementation)
4. Role-based data filtering enforced
5. Users can only access data allowed by their role

### Business Rules
1. Approved schedules cannot be edited by requesters
2. Only admins can approve/disapprove requests
3. Only admins can assign riders
4. Riders can only update status of their assignments
5. Personnel can only view their own requests
6. Admins can view all requests

### Data Integrity
1. Request creation automatically links to authenticated user
2. Name and department fetched from database (not user input)
3. Location selection enforced via map picker
4. Date selection via calendar only (no free text)
5. Time slots from predefined list only

## Current Implementation Status

### ✅ Implemented Features
- Complete authentication system with role-based access
- Account creation with auto-fetched user details
- Delivery request submission with calendar and map selection
- Admin approval/disapproval workflow
- Rider assignment
- Delivery status tracking
- In-app notification system
- Calendar view of scheduled deliveries
- Role-specific dashboards
- Real-time statistics
- Mock data persistence (localStorage)
- Responsive design
- Toast notifications

### 🔄 Ready for Backend Integration
The system is structured to easily integrate with Supabase or any backend:

**Required Database Tables**:
1. `users` - User accounts and profiles
2. `delivery_requests` - All delivery requests
3. `notifications` - User notifications
4. `audit_logs` - System activity logs
5. `configuration` - System settings

**Required Backend Functions**:
1. User authentication and authorization
2. Auto-fetch user details from HR database
3. CRUD operations for requests
4. Role-based row-level security
5. Real-time subscriptions for notifications
6. Audit logging triggers
7. Geocoding service integration

### 🎯 Future Enhancements
- SMS notifications for riders
- Email notifications for admins
- Delivery capacity management (limits per day/slot)
- Route optimization
- Real-time GPS tracking
- Delivery proof (photo upload)
- Analytics dashboard
- Export reports (PDF/Excel)
- Mobile app for riders
- Push notifications

## File Structure

```
/src/app/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── MapPicker.tsx    # Location selection component
│   └── ...
├── context/
│   ├── AuthContext.tsx  # Authentication state
│   └── DataContext.tsx  # Data management state
├── data/
│   └── mockData.ts      # Mock database data
├── pages/
│   ├── Login.tsx        # Login/signup page
│   ├── Dashboard.tsx    # Main dashboard wrapper
│   ├── AdminDashboard.tsx
│   ├── PersonnelDashboard.tsx
│   └── RiderDashboard.tsx
├── types/
│   └── index.ts         # TypeScript type definitions
├── routes.ts            # Route configuration
└── App.tsx              # Root component

/src/styles/
├── index.css            # Main styles
├── leaflet.css          # Leaflet map styles
└── ...
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Demo Usage

1. **Login as Admin**:
   - Email: `admin@company.com`
   - Review pending requests
   - Approve and assign riders
   - View calendar of scheduled deliveries

2. **Login as Personnel**:
   - Email: `john.hr@company.com`
   - Submit new delivery request
   - Track request status
   - View assigned rider details

3. **Login as Rider**:
   - Email: `rider1@company.com`
   - View today's and tomorrow's deliveries
   - Update delivery status
   - Add delivery notes

4. **Create New Account**:
   - Use signup tab
   - Select role (Personnel or Rider)
   - Name and department auto-fetched (simulated)

## Security Considerations

⚠️ **Important**: This is a prototype/demo implementation. For production use:

1. Implement proper backend authentication (OAuth, JWT)
2. Use Supabase Row Level Security or similar
3. Validate all inputs server-side
4. Use HTTPS for all communications
5. Implement rate limiting
6. Add audit logging for all actions
7. Encrypt sensitive data
8. Follow GDPR/privacy regulations
9. Implement proper session management
10. Use environment variables for secrets

## Support & Documentation

For questions or issues, refer to:
- Component documentation in source files
- Type definitions in `/src/app/types/`
- Mock data examples in `/src/app/data/mockData.ts`

## License

This is a demo/prototype system. All rights reserved.
