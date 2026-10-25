import { describe, expect, it } from "vitest";
import { getRoleHomeRoute } from "../../src/app/utils/roleRoutes";

describe("getRoleHomeRoute", () => {
  it("sends personnel users to the V2 portal", () => {
    expect(getRoleHomeRoute("personnel")).toBe("/personnel/v2");
  });

  it("preserves the admin and rider destinations", () => {
    expect(getRoleHomeRoute("admin")).toBe("/admin/dashboard");
    expect(getRoleHomeRoute("rider")).toBe("/rider/dashboard");
  });
});
