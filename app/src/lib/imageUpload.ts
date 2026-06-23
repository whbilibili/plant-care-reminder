/**
 * 双图上传工具函数（GAL-010）。
 *
 * 封装「生成两个 uploadUrl → 分别上传原图和缩略图 → 返回两个 storageId」的完整流程。
 * 任一上传失败则整体抛出错误，不做部分重试。
 */

export interface UploadImagePairResult {
  imageStorageId: string;
  thumbnailStorageId: string;
}

/**
 * 上传单个 Blob 到 Convex storage，返回 storageId。
 */
async function uploadSingleBlob(
  blob: Blob,
  uploadUrl: string,
): Promise<string> {
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: blob,
  });

  if (!response.ok) {
    throw new Error("图片上传失败，请稍后再试。");
  }

  const payload = (await response.json()) as { storageId?: string };
  if (!payload.storageId) {
    throw new Error("图片上传未返回存储标识。");
  }

  return payload.storageId;
}

/**
 * 并行上传原图 + 缩略图，返回两个 storageId。
 *
 * @param generateUploadUrl - 调用 Convex 的 generatePlantImageUploadUrl mutation，返回 { uploadUrl }。
 * @param original - 原图 Blob。
 * @param thumbnail - 缩略图 Blob。
 */
export async function uploadImagePair(
  generateUploadUrl: () => Promise<{ uploadUrl: string }>,
  original: Blob,
  thumbnail: Blob,
): Promise<UploadImagePairResult> {
  // 并行获取两个 upload URL
  const [{ uploadUrl: originalUrl }, { uploadUrl: thumbnailUrl }] = await Promise.all([
    generateUploadUrl(),
    generateUploadUrl(),
  ]);

  // 并行上传
  const [imageStorageId, thumbnailStorageId] = await Promise.all([
    uploadSingleBlob(original, originalUrl),
    uploadSingleBlob(thumbnail, thumbnailUrl),
  ]);

  return { imageStorageId, thumbnailStorageId };
}
