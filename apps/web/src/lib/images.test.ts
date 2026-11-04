import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ImageError, processImage } from "./images";

const img = (w: number, h: number, fmt: "jpeg" | "png" | "webp" | "gif" = "jpeg") =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#3366cc" } })[fmt === "gif" ? "gif" : fmt]().withExif({ IFD0: { Copyright: "secret" } }).toBuffer();

describe("processImage", () => {
  it("réduit, convertit en JPEG et produit une vignette", async () => {
    const r = await processImage(await img(3000, 2000, "png"));
    expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(2000);
    const m = await sharp(r.thumb).metadata();
    expect(m.format).toBe("jpeg"); expect(m.width).toBeLessThanOrEqual(480);
  });
  it("retire les métadonnées EXIF", async () => {
    const r = await processImage(await img(800, 600));
    expect((await sharp(r.main).metadata()).exif).toBeUndefined();
  });
  it("rejette un fichier qui n'est pas une image (même avec extension .jpg)", async () => {
    await expect(processImage(Buffer.from("<script>alert(1)</script>"))).rejects.toMatchObject({ code: "not_image" });
  });
  it("rejette un format non autorisé (gif)", async () => { await expect(processImage(await img(800, 600, "gif"))).rejects.toMatchObject({ code: "unsupported" }); });
  it("rejette une image trop petite", async () => { await expect(processImage(await img(100, 80))).rejects.toBeInstanceOf(ImageError); });
});
