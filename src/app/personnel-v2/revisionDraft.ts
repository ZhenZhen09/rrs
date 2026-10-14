import type { DeliveryRequest, Location, RequestType, UrgencyLevel } from "../types";

export interface PersonnelV2Draft {
  category: string;
  urgency: string;
  date: string;
  slot: string;
  pickup: Location | null;
  dropoff: Location | null;
  recipient: string;
  recipientContact: string;
  pickupContact: string;
  instructions: string;
}

export function normalizeLocation(location?: Partial<Location> | string | null): Location | null {
  if (!location) return null;
  let candidate: Partial<Location>;
  if (typeof location === "string") {
    try {
      candidate = JSON.parse(location) as Partial<Location>;
    } catch {
      return null;
    }
  } else {
    candidate = location;
  }
  const lat = Number(candidate.lat ?? (candidate as Partial<Location> & { latitude?: number }).latitude);
  const lng = Number(candidate.lng ?? (candidate as Partial<Location> & { longitude?: number }).longitude);
  const address = candidate.address || (candidate as Partial<Location> & { formatted_address?: string }).formatted_address || "Selected location";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { ...candidate, lat, lng, address } as Location;
}

export function createRevisionDraft(request: DeliveryRequest, baseDraft: PersonnelV2Draft): PersonnelV2Draft {
  return {
    ...baseDraft,
    category: request.request_type as RequestType,
    urgency: request.urgency_level as UrgencyLevel,
    date: request.delivery_date,
    slot: request.time_window,
    pickup: normalizeLocation(request.pickup_location),
    dropoff: normalizeLocation(request.dropoff_location),
    recipient: request.recipient_name || "",
    recipientContact: request.recipient_contact || "",
    pickupContact: request.pickup_contact_name || "",
    instructions: request.personnel_instructions || "",
  };
}
