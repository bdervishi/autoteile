import "server-only";
import sharp from "sharp";
export async function sanitiseImage(dataUrl: string) {
  if (
    dataUrl.length > 8 * 1024 * 1024 ||
    !/^data:image\/(jpeg|png|webp|heif|heic|avif|gif);base64,[a-zA-Z0-9+/]+=*$/.test(
      dataUrl,
    )
  )
    throw new Error("Invalid image");
  const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
  const image = sharp(bytes, { limitInputPixels: 50_000_000, failOn: "error" });
  const metadata = await image.metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp", "heif", "avif", "gif"].includes(metadata.format)
  )
    throw new Error("Invalid image format");
  const output = await image
    .rotate()
    .resize({
      width: 1280,
      height: 1280,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
  if (output.length > 2 * 1024 * 1024) throw new Error("Image too large");
  return output;
}
export function ownPhotoUrl(value: string, base: string) {
  try {
    const url = new URL(value),
      allowed = new URL(base);
    return (
      url.origin === allowed.origin &&
      url.pathname.startsWith("/storage/v1/object/public/parts-photos/") &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      !/%2f|%5c/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}
