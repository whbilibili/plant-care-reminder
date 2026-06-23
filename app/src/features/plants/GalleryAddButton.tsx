import { Loader2, Plus } from "lucide-react";

interface GalleryAddButtonProps {
  disabled: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

/**
 * 图集添加按钮（GAL-012）：80x80 虚线边框，居中 Plus 图标。
 * disabled 态 opacity 0.4 且不可点击。
 * isLoading 态显示旋转 Loader2 图标。
 */
export function GalleryAddButton({ disabled, isLoading, onClick }: GalleryAddButtonProps) {
  const isInactive = disabled || isLoading;

  return (
    <button
      aria-label={isLoading ? "正在上传图片" : "添加图片到图集"}
      disabled={isInactive}
      onClick={onClick}
      style={{
        ...buttonStyle,
        opacity: isInactive ? 0.6 : 1,
        cursor: isInactive ? "not-allowed" : "pointer",
        borderColor: isLoading ? "var(--color-leaf)" : "var(--color-line)",
      }}
      type="button"
    >
      {isLoading ? (
        <Loader2
          className="complete-spin"
          size={22}
          color="var(--color-leaf)"
        />
      ) : (
        <Plus size={24} color="var(--color-muted)" />
      )}
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  minWidth: "80px",
  border: "2px dashed var(--color-line)",
  borderRadius: "var(--space-sm)",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "opacity 0.15s, border-color 0.2s",
};
