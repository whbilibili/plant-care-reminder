import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Icon } from "../../components/ui/Icon";
import { prefersReducedMotion } from "../../lib/motion";

interface TaskCompletionPhotoPromptProps {
  visible: boolean;
  onCapture: () => void;
  onDismiss: () => void;
}

/**
 * GAL-016: 完成任务后的轻量附图引导入口。
 * pill 形状，底部 slide-up 出现，3 秒后自动 fade-out。
 * 不阻塞任何其他操作。
 */
export function TaskCompletionPhotoPrompt({
  visible,
  onCapture,
  onDismiss,
}: TaskCompletionPhotoPromptProps) {
  const [phase, setPhase] = useState<"hidden" | "entering" | "visible" | "exiting">("hidden");

  useEffect(() => {
    if (visible) {
      if (prefersReducedMotion()) {
        setPhase("visible");
      } else {
        // 强制一帧 hidden 后再 entering
        setPhase("hidden");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("entering");
          });
        });
        // entering -> visible 动画结束
        const enterTimer = setTimeout(() => setPhase("visible"), 220);
        return () => clearTimeout(enterTimer);
      }
    } else {
      setPhase("hidden");
    }
  }, [visible]);

  // 3 秒自动消失
  useEffect(() => {
    if (phase === "visible") {
      const timer = setTimeout(() => {
        if (prefersReducedMotion()) {
          setPhase("hidden");
          onDismiss();
        } else {
          setPhase("exiting");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, onDismiss]);

  // exiting 动画结束后通知外部
  useEffect(() => {
    if (phase === "exiting") {
      const timer = setTimeout(() => {
        setPhase("hidden");
        onDismiss();
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [phase, onDismiss]);

  if (phase === "hidden") return null;

  const animStyle = getAnimationStyle(phase);

  return (
    <button
      type="button"
      onClick={onCapture}
      style={{ ...pillStyle, ...animStyle }}
      aria-label="拍照记录"
    >
      <Icon icon={Camera} size={16} colorVar="--color-leaf" />
      <span style={textStyle}>记录一下?</span>
    </button>
  );
}

// ─── 动画样式 ────────────────────────────────────────────────────

function getAnimationStyle(
  phase: "entering" | "visible" | "exiting",
): React.CSSProperties {
  switch (phase) {
    case "entering":
      return {
        opacity: 1,
        transform: "translateX(-50%) translateY(0)",
        transition: "opacity 200ms ease-out, transform 200ms ease-out",
      };
    case "visible":
      return {
        opacity: 1,
        transform: "translateX(-50%) translateY(0)",
      };
    case "exiting":
      return {
        opacity: 0,
        transform: "translateX(-50%) translateY(0)",
        transition: "opacity 300ms ease-in",
      };
  }
}

// ─── 样式 ─────────────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  appearance: "none",
  position: "fixed",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
  left: "50%",
  transform: "translateX(-50%) translateY(12px)",
  opacity: 0,
  zIndex: 100,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "40px",
  padding: "0 16px",
  borderRadius: "20px",
  border: "none",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-card)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const textStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--color-ink)",
  lineHeight: 1,
};
