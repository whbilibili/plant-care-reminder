/**
 * 判断文件是否为 HEIC/HEIF 格式。
 *
 * iPhone 默认拍照格式为 HEIC，浏览器无法原生渲染（<img> 加载后裂图）。
 * file.type 在不同浏览器/系统下可能是 image/heic、image/heif，也可能为空，
 * 因此同时用 MIME 与文件扩展名兜底判断。
 */
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }

  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * 将上传文件规范化为浏览器可渲染的格式。
 *
 * 若为 HEIC/HEIF，则在前端转码为 JPEG 后返回新的 File；
 * 其它格式（JPEG/PNG/WebP 等）原样返回，不引入额外开销。
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  // 动态加载 heic2any：该库顶层引用 Web Worker，仅在确实需要转码时再加载，
  // 既避免非 HEIC 场景的额外开销，也避免在测试（jsdom）环境的顶层副作用。
  const { default: heic2any } = await import("heic2any");

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  // heic2any 在多帧场景下可能返回 Blob[]，取第一帧即可。
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const nextName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";

  return new File([blob], nextName, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
