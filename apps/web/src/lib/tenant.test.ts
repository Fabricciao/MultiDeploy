import { describe, expect, it } from "vitest";
import { classifyHost } from "./tenant";

const D = ["multideploy.app"];
describe("classifyHost", () => {
  it("sous-domaine d'agence", () => expect(classifyHost("sharon.multideploy.app", D)).toEqual({ kind: "subdomain", slug: "sharon" }));
  it("ignore le port et la casse", () => expect(classifyHost("Sharon.MultiDeploy.app:443", D)).toEqual({ kind: "subdomain", slug: "sharon" }));
  it.each(["multideploy.app", "www.multideploy.app", "app.multideploy.app", "api.multideploy.app", "a.b.multideploy.app", "-x.multideploy.app"])("%s n'est pas une agence", (h) => expect(classifyHost(h, D).kind).toBe("none"));
  it("domaine personnalisé", () => expect(classifyHost("crm.agence.co.il", D)).toEqual({ kind: "custom", host: "crm.agence.co.il" }));
  it("localhost / IP / sans configuration : aucune résolution", () => { expect(classifyHost("localhost:3000", D).kind).toBe("none"); expect(classifyHost("10.0.0.1", D).kind).toBe("none"); expect(classifyHost("x.y.test", []).kind).toBe("none"); });
  it("hôte absent", () => expect(classifyHost(null, D).kind).toBe("none"));
});
