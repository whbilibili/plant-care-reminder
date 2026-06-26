import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PLANT_NAME_MAX_LENGTH } from "../../lib/constants";

interface ConfirmedNameInputProps {
  /** 当前输入值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 是否处于确认态（物种已选中） */
  isConfirmed: boolean;
  /** 确认态显示的物种标准名 */
  confirmedName?: string;
  /** 点击 × 清除按钮回调 */
  onClear: () => void;
  /** 表单校验错误信息 */
  error?: string;
  /** input 元素的 id（供 label htmlFor 关联） */
  id?: string;
  /** 额外的 aria 属性 */
  ariaExpanded?: boolean;
  ariaControls?: string;
  /** 输入框获得焦点回调 */
  onFocus?: () => void;
  /** 输入框失去焦点回调 */
  onBlur?: () => void;
}

/**
 * ConfirmedNameInput — 品种确认态名称输入框。
 *
 * 两种状态：
 * - 普通态：标准文本输入框，白色背景，1px 线框。
 * - 确认态：mist 底色 + leaf 2px 下边框 + 左侧 🌿 + 右侧 × + 粗体。
 *
 * 状态切换遵循 UI spec §2.10 的 150ms ease-out 过渡。
 * 退出触发：点击 ×、修改文本（输入/粘贴/删除）。
 */
export function ConfirmedNameInput({
  value,
  onChange,
  isConfirmed,
  confirmedName: _confirmedName,
  onClear,
  error,
  id,
  ariaExpanded,
  ariaControls,
  onFocus,
  onBlur,
}: ConfirmedNameInputProps) {
  // 跟踪确认态的视觉动画阶段
  const [showDecorations, setShowDecorations] = useState(isConfirmed);
  const prevConfirmedRef = useRef(isConfirmed);
  const inputRef = useRef<HTMLInputElement>(null);

  // 确认态进入/退出时管理装饰元素的显隐
  useEffect(() => {
    if (isConfirmed && !prevConfirmedRef.current) {
      // 进入确认态：延迟 50ms 后显示装饰（per spec: step 3 at 50ms）
      const timer = setTimeout(() => setShowDecorations(true), 50);
      prevConfirmedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isConfirmed && prevConfirmedRef.current) {
      // 退出确认态：立即开始退出动画，100ms 后隐藏
      const timer = setTimeout(() => setShowDecorations(false), 100);
      prevConfirmedRef.current = false;
      return () => clearTimeout(timer);
    }
  }, [isConfirmed]);

  // 同步初始状态
  useEffect(() => {
    setShowDecorations(isConfirmed);
    prevConfirmedRef.current = isConfirmed;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClear();
      // 清除后聚焦输入框
      inputRef.current?.focus();
    },
    [onClear],
  );

  // 确认态 vs 普通态的输入框样式
  const inputStyle: CSSProperties = {
    ...baseInputStyle,
    background: isConfirmed ? "var(--color-mist)" : "var(--color-paper)",
    borderColor: error
      ? "var(--color-error)"
      : "var(--color-line)",
    borderWidth: "1px",
    fontWeight: isConfirmed ? 600 : 400,
    paddingLeft: isConfirmed ? "calc(var(--space-md) + 28px)" : "14px",
    paddingRight: isConfirmed ? "calc(var(--space-md) + 32px)" : "14px",
    // 过渡：bg/border-color/padding 150ms ease-out，font-weight 瞬时
    transition:
      "background 150ms ease-out, border-color 150ms ease-out, padding-left 150ms ease-out, padding-right 150ms ease-out",
    ...(error && !isConfirmed
      ? { boxShadow: "0 0 0 3px rgba(197,48,48,0.12)" }
      : {}),
  };

  return (
    <div style={wrapperStyle}>
      {/* 左侧 🌿 品种标识图标 */}
      {showDecorations && isConfirmed && (
        <span
          aria-hidden="true"
          style={{
            ...leftIconStyle,
            animation: "confirmedIconEnter 150ms ease-out forwards",
            animationDelay: "0ms",
          }}
        >
          🌿
        </span>
      )}

      {/* 退出中的图标（淡出） */}
      {showDecorations && !isConfirmed && (
        <span
          aria-hidden="true"
          style={{
            ...leftIconStyle,
            opacity: 0,
            transition: "opacity 100ms ease-in",
          }}
        >
          🌿
        </span>
      )}

      <input
        ref={inputRef}
        id={id}
        autoComplete="off"
        maxLength={PLANT_NAME_MAX_LENGTH}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="给它起个名字"
        required
        value={value}
        className="form-input-enhanced"
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        style={inputStyle}
      />

      {/* 右侧 × 清除按钮 */}
      {showDecorations && isConfirmed && (
        <button
          type="button"
          className="confirmed-clear-btn"
          aria-label="取消品种关联"
          onClick={handleClear}
          style={{
            ...clearButtonStyle,
            animation: "confirmedClearEnter 150ms ease-out forwards",
            animationDelay: "50ms",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* 确认态动态样式 */}
      <style>{confirmedNameCSS}</style>
    </div>
  );
}

/* ─── CSS for interactive states ─── */

const confirmedNameCSS = `
  .confirmed-clear-btn:hover {
    color: var(--color-ink) !important;
    background: rgba(0, 0, 0, 0.04) !important;
  }
  .confirmed-clear-btn:active {
    color: var(--color-error) !important;
  }
`;

/* ─── Styles ─── */

const wrapperStyle: CSSProperties = {
  position: "relative",
  width: "100%",
};

const baseInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
  fontFamily: "inherit",
};

const leftIconStyle: CSSProperties = {
  position: "absolute",
  left: "var(--space-md)",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "18px",
  lineHeight: 1,
  zIndex: 1,
  pointerEvents: "none",
  flexShrink: 0,
};

const clearButtonStyle: CSSProperties = {
  position: "absolute",
  right: "var(--space-sm)",
  top: "50%",
  transform: "translateY(-50%)",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "transparent",
  color: "var(--color-muted)",
  cursor: "pointer",
  padding: 0,
  zIndex: 1,
  flexShrink: 0,
  transition: "color 150ms ease, background 150ms ease",
};
