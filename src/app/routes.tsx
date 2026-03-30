import { createBrowserRouter, Navigate } from 'react-router';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LiveTrackingDashboard } from './pages/LiveTrackingDashboard';
import { MapPickerPage } from './pages/MapPickerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/tracking/:id',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'personnel']}>
        <LiveTrackingDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/personnel/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['personnel']}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/rider/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['rider']}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/map-picker',
    element: (
      <ProtectedRoute allowedRoles={['personnel', 'admin']}>
        <MapPickerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
