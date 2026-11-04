import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isValidKey, orgOfKey } from "./storage";

const ORG = "11111111-1111-1111-1111-111111111111", ID = "22222222-2222-2222-2222-222222222222";
describe("clés de stockage", () => {
  it("accepte org/<uuid>/<kind>/<uuid>.<ext>", () => { expect(isValidKey(`org/${ORG}/property_photo/${ID}.jpg`)).toBe(true); expect(orgOfKey(`org/${ORG}/x/${ID}.jpg`)).toBe(ORG); });
  it.each([`../etc/passwd`, `org/${ORG}/../other/${ID}.jpg`, `org/${ORG}/photo/${ID}.jpg/../../x`, `org/not-a-uuid/photo/${ID}.jpg`, `/org/${ORG}/photo/${ID}.jpg`, `org/${ORG}/photo/x.jpg`])("rejette %s", (k) => expect(isValidKey(k)).toBe(false));
});
