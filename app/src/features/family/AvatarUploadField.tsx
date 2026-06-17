import { useConvex, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { api } from "../../../convex/_generated/api";
import { normalizeImageFile } from "../plants/normalizeImageFile";
import { uploadPlantImage } from "../plants/uploadPlantImage";
import type { StorageId } from "../../types/domain";

interface AvatarUploadFieldProps {
  /** 当前用户已保存的头像 storageId，无则展示首字母占位。 */
  imageStorageId: StorageId | null;
  /** 显示名，用于无头像时的首字母占位与无障碍 alt。 */
  displayName: string;
}

type UploadState = "idle" | "uploading" | "saved" | "error";

/** 取首字：中文取首字，英文取首字母大写（与 MemberAvatar 一致）。 */
function getInitial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "👤";
  const first = Array.from(trimmed)[0];
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

/**
 * 我的头像上传（SET3-008，E3 个人头像）。
 *
 * 复用植物的 storage 上传链路：normalizeImageFile(HEIC→JPEG) + uploadPlantImage
 * （注入 generateAvatarUploadUrl / getAvatarUrl 回调，零改造），拿到 storageId 后
 * 调 updateMyAvatar 写入用户记录。圆形预览（区别于植物的圆角矩形）。
 *
 * 三态反馈：上传中（uploading）/ 已保存（saved）/ 错误（error）；
 * 失败保留原头像（preview 回退到 savedPreviewUrl，不清空）。
 * MVP 不做裁剪框与上传进度百分比。
 */
export function AvatarUploadField({
  imageStorageId,
  displayName,
}: AvatarUploadFieldProps) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const updateMyAvatar = useMutation(api.users.updateMyAvatar);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);

  // 已保存头像的远端预览 URL（据 imageStorageId 解析）；失败回退到它。
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 据已保存的 storageId 解析远端预览 URL；imageStorageId 变化时重取。
  useEffect(() => {
    if (!imageStorageId) {
      setSavedPreviewUrl(null);
      return;
    }

    let cancelled = false;
    void convex
      .query(api.users.getAvatarUrl, { storageId: imageStorageId as never })
      .then((result) => {
        if (!cancelled) setSavedPreviewUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setSavedPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [convex, imageStorageId]);

  // 卸载时释放本地 ObjectURL，避免内存泄漏。
  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, []);

  const previewUrl = localPreviewUrl ?? savedPreviewUrl;
  const initial = getInitial(displayName);

  function clearLocalPreview() {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  }

  function handleSelectClick() {
    if (uploadState !== "uploading") {
      fileInputRef.current?.click();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile) {
      return;
    }

    setErrorMessage(null);
    setUploadState("uploading");

    let file: File;
    try {
      // HEIC/HEIF（iPhone 默认格式）浏览器无法渲染，上传前先转码为 JPEG。
      file = await normalizeImageFile(originalFile);
    } catch {
      setUploadState("error");
      setErrorMessage("无法读取该图片格式，请改用 JPG 或 PNG 后重试。");
      return;
    }

    // 立即本地预览（乐观）。
    const nextLocalPreviewUrl = URL.createObjectURL(file);
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    localPreviewUrlRef.current = nextLocalPreviewUrl;
    setLocalPreviewUrl(nextLocalPreviewUrl);

    try {
      const uploaded = await uploadPlantImage({
        file,
        generateUploadUrl: () => generateUploadUrl({}),
        // getAvatarUrl 返回 { url }，适配为 uploadPlantImage 期望的 { imageUrl }。
        getPlantImageUrl: async (storageId) => {
          const { url } = await convex.query(api.users.getAvatarUrl, {
            storageId: storageId as never,
          });
          return { imageUrl: url };
        },
      });

      await updateMyAvatar({ imageStorageId: uploaded.storageId as never });

      // 远端已保存：用上传得到的预览作为已保存预览，清掉本地临时预览。
      setSavedPreviewUrl(uploaded.previewUrl);
      clearLocalPreview();
      setUploadState("saved");
    } catch (error) {
      // 失败保留原头像：丢弃本地预览，回退到已保存预览。
      clearLocalPreview();
      setUploadState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "头像上传失败，请稍后再试。",
      );
    }
  }

  const statusText =
    uploadState === "uploading"
      ? "上传中…"
      : uploadState === "saved"
        ? "已保存"
        : uploadState === "error"
          ? (errorMessage ?? "上传失败")
          : previewUrl
            ? "已设置头像"
            : "还没有头像";

  return (
    <section style={fieldStyle}>
      <div style={rowStyle}>
        <div style={avatarPreviewStyle}>
          {previewUrl ? (
            <img
              alt={`${displayName} 的头像`}
              src={previewUrl}
              style={avatarImageStyle}
            />
          ) : (
            <span aria-hidden="true" style={avatarInitialStyle}>
              {initial}
            </span>
          )}
        </div>

        <div style={infoStyle}>
          <p style={labelStyle}>我的头像</p>
          <p
            aria-live="polite"
            style={{
              ...statusStyle,
              color:
                uploadState === "error"
                  ? "var(--color-error)"
                  : "var(--color-muted)",
            }}
          >
            {statusText}
          </p>
        </div>

        <button
          disabled={uploadState === "uploading"}
          onClick={handleSelectClick}
          style={uploadButtonStyle}
          type="button"
        >
          {previewUrl ? "更换" : "上传"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*"
        disabled={uploadState === "uploading"}
        onChange={(event) => void handleFileChange(event)}
        style={hiddenInputStyle}
        type="file"
      />
    </section>
  );
}

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  minHeight: "44px",
};

const avatarPreviewStyle: CSSProperties = {
  flex: "none",
  width: "56px",
  height: "56px",
  borderRadius: "var(--radius-pill)",
  overflow: "hidden",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-mist)",
  border: "1px solid var(--color-line)",
};

const avatarImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitialStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: 1,
  userSelect: "none",
};

const infoStyle: CSSProperties = {
  flex: 1,
  display: "grid",
  gap: "2px",
};

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const statusStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
};

const uploadButtonStyle: CSSProperties = {
  appearance: "none",
  flex: "none",
  minHeight: "36px",
  padding: "0 var(--space-md)",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  border: "1px solid var(--color-line)",
  color: "var(--color-leaf)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const hiddenInputStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
