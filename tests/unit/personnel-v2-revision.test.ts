import { describe, expect, it } from "vitest";
import { createRevisionDraft, normalizeLocation, type PersonnelV2Draft } from "../../src/app/personnel-v2/revisionDraft";

const baseDraft: PersonnelV2Draft = {
  category: "Delivery/Pickup",
  urgency: "Medium",
  date: "2026-09-29",
  slot: "09:00 - 10:00",
  pickup: null,
  dropoff: null,
  recipient: "",
  recipientContact: "",
  pickupContact: "",
  instructions: "",
};

describe("createRevisionDraft", () => {
  it("prefills the wizard from a request while keeping the draft shape", () => {
    const request = {
      request_id: "req-1",
      requester_id: "personnel-1",
      created_at: "2026-09-29T08:00:00.000Z",
      delivery_date: "2026-10-01",
      time_window: "13:00 - 14:00",
      pickup_location: { lat: 14.5, lng: 121, address: "Pickup", businessName: "Pickup Building" },
      dropoff_location: { lat: 14.6, lng: 121.1, address: "Destination", businessName: "Destination Building" },
      recipient_name: "Alex Santos",
      recipient_contact: "09171234567",
      pickup_contact_name: "Lobby desk",
      request_type: "Purchasing / Errand",
      urgency_level: "High",
      personnel_instructions: "Use the loading entrance",
      status: "returned_for_revision",
      delivery_status: "pending",
    } as const;

    const draft = createRevisionDraft(request, baseDraft);

    expect(draft).toMatchObject({
      category: "Purchasing / Errand",
      urgency: "High",
      date: "2026-10-01",
      slot: "13:00 - 14:00",
      recipient: "Alex Santos",
      recipientContact: "09171234567",
      pickupContact: "Lobby desk",
      instructions: "Use the loading entrance",
    });
    expect(draft.pickup?.businessName).toBe("Pickup Building");
    expect(typeof draft.pickup?.lat).toBe("number");
    expect(draft.dropoff?.businessName).toBe("Destination Building");
  });

  it("rejects invalid coordinates before they reach the map", () => {
    expect(normalizeLocation({ lat: undefined, lng: 121, address: "Unknown" })).toBeNull();
    expect(normalizeLocation({ lat: 14.5, lng: 121, address: "Valid" })?.lat).toBe(14.5);
    expect(normalizeLocation(JSON.stringify({ latitude: "14.5", longitude: "121", formatted_address: "Legacy location" }))).toMatchObject({ lat: 14.5, lng: 121, address: "Legacy location" });
  });
});
