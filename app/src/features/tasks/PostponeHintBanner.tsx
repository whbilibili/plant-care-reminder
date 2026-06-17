import { navigate } from "../../app/router";

/**
 * 连续推迟温和建议条的触发阈值（PRD §8.4）。放代码里可调，不开放配置。
 * 偶尔推一次悄无声息，总在推才值得提醒。
 */
export const POSTPONE_HINT_THRESHOLD = 3;

/** 给定连续推迟次数，判断是否应展示温和建议条。 */
export function shouldShowPostponeHint(
  consecutivePostponeCount: number,
  threshold: number = POSTPONE_HINT_THRESHOLD,
) {
  return consecutivePostponeCount >= threshold;
}

interface PostponeHintBannerProps {
  plantId: string;
  taskId: string;
}

/**
 * 连续推迟建议条（PRD §8.5）：把「管教」转为「贴心建议」，
 * 弱雾绿底色不抢主操作，提供跳转养护设置的入口去调整养护周期。
 */
export function PostponeHintBanner({ plantId, taskId }: PostponeHintBannerProps) {
  return (
    <div style={bannerStyle}>
      <span style={hintTextStyle}>这株植物最近总被推迟，要不要调整一下养护周期？</span>
      <button
        onClick={() => navigate(`/plants/${plantId}/tasks/${taskId}/edit`)}
        style={linkStyle}
        type="button"
      >
        去调整
      </button>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  marginTop: "var(--space-sm)",
  padding: "8px 12px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
};

const hintTextStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "0.82rem",
  lineHeight: 1.5,
};

const linkStyle: React.CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  color: "var(--color-leaf)",
  fontSize: "0.82rem",
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
};
