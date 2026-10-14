import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LiveTrackingDashboard } from "./pages/LiveTrackingDashboard";
import { MapPickerPage } from "./pages/MapPickerPage";
import { PersonnelV2Page } from "./personnel-v2/PersonnelV2Page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/tracking/:id",
    element: (
      <ProtectedRoute allowedRoles={["admin", "personnel"]}>
        <LiveTrackingDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/personnel/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["personnel"]}>
        <Navigate to="/personnel/v2" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "/personnel/v2",
    element: (
      <ProtectedRoute allowedRoles={["personnel"]}>
        <PersonnelV2Page />
      </ProtectedRoute>
    ),
  },
  {
    path: "/rider/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["rider"]}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/map-picker",
    element: (
      <ProtectedRoute allowedRoles={["personnel", "admin"]}>
        <MapPickerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
