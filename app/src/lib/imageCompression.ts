/**
 * 前端 Canvas 图片压缩工具（GAL-009）。
 *
 * 输入一个 File/Blob，输出 { original, thumbnail } 双 Blob：
 * - original: 若超过 maxOriginalSizeMB 则等比缩小 + JPEG 压缩，否则原样返回；
 * - thumbnail: 短边 200px 的 JPEG 缩略图（quality 0.7）。
 *
 * canvas 异常时降级：thumbnail 复用 original。
 */

export interface CompressImageOptions {
  /** 原图最大 MB（默认 10）。 */
  maxOriginalSizeMB?: number;
  /** 缩略图短边像素（默认 200）。 */
  thumbnailShortSide?: number;
  /** 缩略图 JPEG quality（默认 0.7）。 */
  thumbnailQuality?: number;
}

export interface CompressImageResult {
  original: Blob;
  thumbnail: Blob;
}

const DEFAULT_MAX_ORIGINAL_SIZE_MB = 10;
const DEFAULT_THUMBNAIL_SHORT_SIDE = 200;
const DEFAULT_THUMBNAIL_QUALITY = 0.7;

/**
 * 将 File 转为 HTMLImageElement（通过 ObjectURL）。
 */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法加载图片。"));
    };
    img.src = url;
  });
}

/**
 * 在 canvas 上绘制并导出为 JPEG Blob。
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob 返回 null。"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressImage(
  file: File | Blob,
  options?: CompressImageOptions,
): Promise<CompressImageResult> {
  const maxOriginalSizeMB = options?.maxOriginalSizeMB ?? DEFAULT_MAX_ORIGINAL_SIZE_MB;
  const thumbnailShortSide = options?.thumbnailShortSide ?? DEFAULT_THUMBNAIL_SHORT_SIDE;
  const thumbnailQuality = options?.thumbnailQuality ?? DEFAULT_THUMBNAIL_QUALITY;

  // 加载图片到 Image 元素
  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;

  // ─── 处理原图 ───
  let original: Blob;
  const maxBytes = maxOriginalSizeMB * 1024 * 1024;

  if (file.size <= maxBytes) {
    original = file;
  } else {
    // 等比缩小：目标尺寸为 2048px 长边，JPEG 0.85
    const maxDim = 2048;
    const scale = Math.min(maxDim / w, maxDim / h, 1);
    const ow = Math.round(w * scale);
    const oh = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = ow;
    canvas.height = oh;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) {
      // canvas 不可用，降级原样
      original = file;
    } else {
      ctx2d.drawImage(img, 0, 0, ow, oh);
      original = await canvasToBlob(canvas, 0.85);
    }
  }

  // ─── 生成缩略图 ───
  let thumbnail: Blob;
  try {
    const shortSide = Math.min(w, h);
    const scale = thumbnailShortSide / shortSide;
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) {
      throw new Error("Canvas context unavailable");
    }
    ctx2d.drawImage(img, 0, 0, tw, th);
    thumbnail = await canvasToBlob(canvas, thumbnailQuality);
  } catch {
    // canvas 异常时降级：thumbnail 复用 original
    thumbnail = original;
  }

  return { original, thumbnail };
}
