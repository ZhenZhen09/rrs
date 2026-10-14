import type { UserRole } from "../types";

export function getRoleHomeRoute(role?: UserRole | string | null): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "personnel":
      return "/personnel/v2";
    case "rider":
      return "/rider/dashboard";
    default:
      return "/";
  }
}
