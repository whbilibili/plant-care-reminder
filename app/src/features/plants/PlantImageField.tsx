import { useConvex, useMutation } from "convex/react";
import { useEffect, useId, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { showToast } from "../../components/ui/GlobalToast";
import type { StorageId } from "../../types/domain";
import { normalizeImageFile } from "./normalizeImageFile";
import { uploadPlantImage } from "./uploadPlantImage";

export interface PlantImageValue {
  previewUrl: string | null;
  storageId: StorageId | null;
}

interface PlantImageFieldProps {
  disabled?: boolean;
  hint?: string;
  label?: string;
  onChange: (value: PlantImageValue) => void;
  value: PlantImageValue;
}

export function PlantImageField({
  disabled = false,
  hint = "建议上传方图或竖图，后续在卡片和详情页里都会优先展示。",
  label = "植物封面图",
  onChange,
  value,
}: PlantImageFieldProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.plants.generatePlantImageUploadUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded">("idle");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, []);

  const previewUrl = localPreviewUrl ?? value.previewUrl;

  const handleSelectClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = event.target.files?.[0];
    event.target.value = "";

    if (!originalFile) {
      return;
    }

    setPendingFileName(originalFile.name);
    setUploadError(null);
    setUploadState("uploading");

    let file: File;
    try {
      // HEIC/HEIF（iPhone 默认格式）浏览器无法渲染，上传前先转码为 JPEG。
      file = await normalizeImageFile(originalFile);
    } catch {
      setUploadState("idle");
      setPendingFileName(null);
      setUploadError("无法读取该图片格式，请改用 JPG 或 PNG 后重试。");
      return;
    }

    const nextLocalPreviewUrl = URL.createObjectURL(file);
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    localPreviewUrlRef.current = nextLocalPreviewUrl;

    setLocalPreviewUrl(nextLocalPreviewUrl);

    try {
      const uploadedImage = await uploadPlantImage({
        file,
        generateUploadUrl: () => generateUploadUrl({}),
        getPlantImageUrl: (storageId) =>
          convex.query(api.plants.getPlantImageUrl, {
            storageId: storageId as never,
          }),
      });

      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }

      setLocalPreviewUrl(null);
      setUploadState("uploaded");
      showToast("图片上传成功");
      onChange(uploadedImage);
    } catch (error) {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }

      setLocalPreviewUrl(null);
      setUploadState("idle");
      setPendingFileName(null);
      setUploadError(
        error instanceof Error
          ? error.message
          : "植物图片上传失败，请稍后再试。",
      );
    }
  };

  return (
    <section style={fieldStyle}>
      <div style={headerStyle}>
        <label htmlFor={fieldId} style={labelStyle}>
          {label}
        </label>
        <p style={hintStyle}>{hint}</p>
      </div>

      <div style={previewCardStyle}>
        {previewUrl ? (
          <img
            alt="已选植物封面预览"
            src={previewUrl}
            style={previewImageStyle}
          />
        ) : (
          <div aria-live="polite" style={previewPlaceholderStyle}>
            <p style={previewPlaceholderEyebrowStyle}>还没有图片</p>
            <p style={previewPlaceholderCopyStyle}>
              上传一张清晰的植物照片，后续在卡片和详情页里都会优先展示。
            </p>
          </div>
        )}
      </div>

      {uploadState === "uploading" && (
        <div style={statusRowStyle}>
          <span style={metaPillStyle}>
            正在上传 {pendingFileName ?? "图片"}
          </span>
        </div>
      )}

      <input
        id={fieldId}
        ref={fileInputRef}
        accept="image/*"
        disabled={disabled}
        onChange={handleFileChange}
        style={hiddenInputStyle}
        type="file"
      />

      <div style={actionsStyle}>
        <Button
          disabled={disabled || uploadState === "uploading"}
          onClick={handleSelectClick}
          type="button"
          variant={previewUrl ? "secondary" : "primary"}
        >
          {uploadState === "uploading"
            ? "图片上传中..."
            : previewUrl
              ? "替换图片"
              : "上传图片"}
        </Button>
      </div>

      <FormError message={uploadError} />
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const headerStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  paddingLeft: "10px",
  borderLeft: "3px solid var(--color-leaf)",
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.5,
};

const previewCardStyle: React.CSSProperties = {
  minHeight: "216px",
  borderRadius: "22px",
  overflow: "hidden",
  border: "1px solid var(--color-line)",
  background:
    "linear-gradient(140deg, rgba(70,112,97,0.12) 0%, var(--color-mist) 62%, rgba(241,197,103,0.12) 100%)",
};

const previewImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: "216px",
  maxHeight: "320px",
  objectFit: "cover",
};

const previewPlaceholderStyle: React.CSSProperties = {
  minHeight: "216px",
  padding: "24px",
  display: "grid",
  alignContent: "end",
  gap: "8px",
};

const previewPlaceholderEyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontWeight: 700,
};

const previewPlaceholderCopyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1rem",
  lineHeight: 1.6,
};

const statusRowStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "0.82rem",
  fontWeight: 700,
};

const hiddenInputStyle: React.CSSProperties = {
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

const actionsStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};
