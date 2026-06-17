import { prefersReducedMotion } from "../../lib/motion";

type GreetingState = "all_done" | "has_today" | "has_overdue";

interface TodoGreetingCardProps {
  /** 逾期区涉及的待养护植物株数（去重）。 */
  overduePlantCount: number;
  /** 今日待养护植物株数（去重）。 */
  todayPlantCount: number;
}

function resolveState(overduePlantCount: number, todayPlantCount: number): GreetingState {
  if (overduePlantCount > 0) {
    return "has_overdue";
  }
  if (todayPlantCount > 0) {
    return "has_today";
  }
  return "all_done";
}

/**
 * 状态化情感反馈区（替代 Banner）。三态：
 * - all_done：渐变 + 暖金装饰 + 右上角光晕，奖赏态（唯一允许「华丽」的时刻）。
 * - has_today：--color-mist 平涂，克制。
 * - has_overdue：--color-mist 打底 + 左侧 --color-warning 细色条，温和提醒（不用警报红）。
 * 纯信息卡，不可点击。株数随 listDueTasks 结果实时更新。
 */
export function TodoGreetingCard({ overduePlantCount, todayPlantCount }: TodoGreetingCardProps) {
  const state = resolveState(overduePlantCount, todayPlantCount);

  if (state === "all_done") {
    return (
      <section aria-label="今日养护状态" style={allDoneCardStyle}>
        <span aria-hidden="true" style={glowStyle} />
        <p style={allDoneTextStyle}>🌿 今天的植物都照顾好啦</p>
        <span aria-hidden="true" style={goldLeafStyle}>
          🍃
        </span>
      </section>
    );
  }

  if (state === "has_today") {
    return (
      <section aria-label="今日养护状态" style={mistCardStyle}>
        <p style={mistTextStyle}>
          今天要照顾 <AnimatedCount value={todayPlantCount} /> 株植物
        </p>
      </section>
    );
  }

  return (
    <section aria-label="今日养护状态" style={{ ...mistCardStyle, ...overdueCardStyle }}>
      <span aria-hidden="true" style={overdueStripStyle} />
      <p style={mistTextStyle}>
        有 <AnimatedCount value={overduePlantCount} /> 株植物在等你
      </p>
    </section>
  );
}

/**
 * 株数变化时的轻量淡入动效：以 value 为 key 重挂，触发 greeting-count-fade。
 * reduced-motion 偏好下不挂动画（且 tokens.css 全局兜底会把时长压到约 0）。
 */
function AnimatedCount({ value }: { value: number }) {
  const animate = !prefersReducedMotion();
  return (
    <span
      key={animate ? value : undefined}
      style={animate ? animatedCountStyle : countAccentStyle}
    >
      {value}
    </span>
  );
}

const baseCardStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-lg)",
  overflow: "hidden",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--color-line)",
};

const allDoneCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  background: "var(--gradient-botanical)",
  boxShadow: "var(--shadow-card)",
};

const glowStyle: React.CSSProperties = {
  position: "absolute",
  top: "-40px",
  right: "-40px",
  width: "120px",
  height: "120px",
  background: "var(--gradient-accent)",
  borderRadius: "50%",
  pointerEvents: "none",
};

const allDoneTextStyle: React.CSSProperties = {
  position: "relative",
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.15rem",
  fontWeight: 700,
  lineHeight: 1.4,
  color: "var(--color-leaf)",
};

const goldLeafStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "var(--space-sm)",
  right: "var(--space-md)",
  fontSize: "1.1rem",
  color: "var(--color-gold)",
  textShadow: "0 1px 2px rgba(241,197,103,0.4)",
};

const mistCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  background: "var(--color-mist)",
};

const overdueCardStyle: React.CSSProperties = {
  paddingLeft: "calc(var(--space-lg) + 4px)",
};

const overdueStripStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: "4px",
  background: "var(--color-warning)",
  borderTopLeftRadius: "var(--radius-card)",
  borderBottomLeftRadius: "var(--radius-card)",
};

const mistTextStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.05rem",
  fontWeight: 600,
  lineHeight: 1.4,
  color: "var(--color-ink)",
};

const countAccentStyle: React.CSSProperties = {
  color: "var(--color-leaf)",
  fontWeight: 700,
};

const animatedCountStyle: React.CSSProperties = {
  ...countAccentStyle,
  display: "inline-block",
  animation: "greeting-count-fade 200ms ease-out",
};
