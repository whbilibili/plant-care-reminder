import type { StorageId } from "../../types/domain";

export interface PlantImageUploadResult {
  previewUrl: string;
  storageId: StorageId;
}

interface UploadPlantImageArgs {
  file: File;
  generateUploadUrl: () => Promise<{ uploadUrl: string }>;
  getPlantImageUrl: (storageId: StorageId) => Promise<{ imageUrl: string }>;
  signal?: AbortSignal;
}

export async function uploadPlantImage({
  file,
  generateUploadUrl,
  getPlantImageUrl,
  signal,
}: UploadPlantImageArgs): Promise<PlantImageUploadResult> {
  const { uploadUrl } = await generateUploadUrl();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: file,
    signal,
  });

  if (!uploadResponse.ok) {
    throw new Error("植物图片上传失败，请稍后再试。");
  }

  const payload = (await uploadResponse.json()) as { storageId?: string };
  if (!payload.storageId) {
    throw new Error("植物图片上传未返回存储标识，请稍后再试。");
  }

  const { imageUrl } = await getPlantImageUrl(payload.storageId);
  if (!imageUrl) {
    throw new Error("植物图片预览生成失败，请稍后再试。");
  }

  return {
    storageId: payload.storageId,
    previewUrl: imageUrl,
  };
}
