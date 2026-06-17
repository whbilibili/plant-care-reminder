import { useCallback, useState } from "react";

import { Button } from "../../components/ui/Button";
import { prefersReducedMotion } from "../../lib/motion";
import { computePostponePreview } from "./scheduling";

const longDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
});

/** 退场动画时长，需与 sheet-sink-out / sheet-overlay-out 的 CSS 时长保持一致。 */
const EXIT_DURATION_MS = 200;

interface PostponeConfirmSheetProps {
  /** 任务当前的下次到期时间，用于本地推导逾期天数与预览日期。 */
  currentNextDueAt: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 推迟轻确认底部 sheet（PRD §8.2）。确认前透明告知「这次推迟意味着什么」，
 * 逾期/今日两种语境文案不同，语气温和不说教，告知文案用 --color-muted。
 *
 * 交互动效（frontend-design）：遮罩淡入 + sheet 从底部滑入带轻微回弹；关闭时
 * 先播放下沉退场动画再卸载。全部尊重 prefers-reduced-motion（reduce 下即时切换，
 * 由 tokens.css 全局兜底将动画时长压到约 0）。
 */
export function PostponeConfirmSheet({
  currentNextDueAt,
  isSubmitting,
  onCancel,
  onConfirm,
}: PostponeConfirmSheetProps) {
  const [closing, setClosing] = useState(false);

  const preview = computePostponePreview(currentNextDueAt);
  const nextDateCopy = longDateFormatter.format(new Date(preview.nextDueAtPreview));
  const noticeCopy = preview.isOverdue
    ? `该任务已逾期 ${preview.overdueDays} 天，推迟后将从今天起顺延，下次提醒 ${nextDateCopy}`
    : `推迟后下次提醒将变为 ${nextDateCopy}`;

  /** 触发退场：reduce 模式直接回调，否则播放退场动画后再卸载。 */
  const requestClose = useCallback(() => {
    if (isSubmitting || closing) return;
    if (prefersReducedMotion()) {
      onCancel();
      return;
    }
    setClosing(true);
    window.setTimeout(onCancel, EXIT_DURATION_MS);
  }, [closing, isSubmitting, onCancel]);

  return (
    <div
      aria-label="推迟确认"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      style={{
        ...overlayStyle,
        animation: `${closing ? "sheet-overlay-out" : "sheet-overlay-in"} ${EXIT_DURATION_MS}ms ease forwards`,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          ...sheetStyle,
          animation: closing
            ? `sheet-sink-out ${EXIT_DURATION_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
            : "sheet-rise-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <span aria-hidden="true" style={grabberStyle} />
        <p style={titleStyle}>推迟这项养护</p>
        <p style={noticeStyle}>{noticeCopy}</p>
        <div style={actionsStyle}>
          <Button
            disabled={isSubmitting}
            fullWidth={false}
            onClick={requestClose}
            type="button"
            variant="ghost"
          >
            再想想
          </Button>
          <Button disabled={isSubmitting} fullWidth={false} onClick={onConfirm} type="button">
            {isSubmitting ? "推迟中..." : "推迟 1 天"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  // 高于底部导航 (50) 与撤销浮条 (60)，避免模态弹窗被遮挡。
  zIndex: 100,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  // 悬浮 sheet 四周留白：两侧 + 底部抬离屏幕边缘与底部导航。
  padding:
    "0 var(--space-md) calc(var(--space-md) + 64px + env(safe-area-inset-bottom, 0px))",
  background: "rgba(31, 71, 61, 0.32)",
  backdropFilter: "blur(2px)",
};

const sheetStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  background: "var(--color-surface)",
  // 悬浮 sheet：四角统一圆角，不再贴底直角。
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md) var(--space-lg) var(--space-lg)",
  display: "grid",
  justifyItems: "stretch",
  gap: "var(--space-md)",
  boxShadow: "var(--shadow-sheet)",
};

const grabberStyle: React.CSSProperties = {
  justifySelf: "center",
  width: "40px",
  height: "4px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-line)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const noticeStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.92rem",
  lineHeight: 1.6,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};
