import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const personnelPage = readFileSync(resolve(repoRoot, "src/app/personnel-v2/PersonnelV2Page.tsx"), "utf8");
const requestsRoute = readFileSync(resolve(repoRoot, "server/routes/requests.ts"), "utf8");

describe("priority regression fixes", () => {
  it("passes a selection handler to overview request rows", () => {
    expect(personnelPage).toMatch(/activeRequests\.slice\(0, 3\)\.map\(.*?<RequestRow[\s\S]*?onSelect=/);
  });

  it("wires the personnel notification bell to an interaction", () => {
    const notificationButton = personnelPage.match(/aria-label="Notifications"[^>]*>/)?.[0] ?? "";

    expect(notificationButton).toContain("onClick");
  });

  it("offers matching hourly arrival slots from 8 AM through 7 PM in both request forms", () => {
    expect(personnelPage).toContain('const ARRIVAL_TIME_SLOTS = Array.from({ length: 11 }, (_, index) => {');
    expect(personnelPage).toContain('ARRIVAL_TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)');
    expect(personnelPage.match(/ARRIVAL_TIME_SLOTS\.map\(\(slot\) => <option key=\{slot\}>\{slot\}<\/option>\)/g) ?? []).toHaveLength(2);
  });

  it("keeps VAPID configuration out of the request route", () => {
    expect(requestsRoute).not.toContain("setVapidDetails");
    expect(requestsRoute).not.toContain("BCXzd-f_");
  });

  it("mounts only the viewport-specific Dispatch Console layout", () => {
    expect(personnelPage).toBeDefined();
    const dispatchConsole = readFileSync(resolve(repoRoot, "src/app/pages/Admin/DispatchConsole.tsx"), "utf8");

    expect(dispatchConsole).toContain('useMediaQuery("(max-width: 767px)")');
    expect(dispatchConsole).toContain("!isMobile");
    expect(dispatchConsole).toContain("isMobile &&");
  });

  it("renders one Manage Route action in request details", () => {
    const requestDetails = readFileSync(resolve(repoRoot, "src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx"), "utf8");

    expect(requestDetails.match(/Manage Route/g) ?? []).toHaveLength(1);
  });
});
