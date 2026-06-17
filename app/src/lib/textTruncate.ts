/**
 * 公共文本截断样式工具（long-text-hardening-v0.5 · TEXT-007）。
 *
 * 收口此前散落在各列表卡片中复制粘贴的 whiteSpace/overflow/textOverflow 组合，
 * 以及部分缺 whiteSpace:nowrap 的不一致写法。所有需要单行省略或多行 clamp 的
 * 文本，统一引用这里的样式，禁止再各自手写第二份。
 *
 * 用法说明：
 * - 单行省略（名称/位置等关键标识）：把 truncateSingleLine 合入元素 style，
 *   并确保其 flex 父容器有 minWidth:0（否则 flex 子项默认 min-width:auto
 *   不收缩，ellipsis 形同虚设 —— 即 TEXT-001 修过的「假截断」陷阱）。
 * - 多行 clamp（任务名/简介等次要文本）：用 clampLines(n) 限制最多 n 行，
 *   超出省略号，并带 break-word 防超长连续串横向溢出。
 */

/**
 * 单行省略样式：超长文本在一行内截断并显示省略号。
 *
 * 注意：作为 flex 子项使用时，父容器需设置 minWidth:0，本对象自身也带
 * minWidth:0 兜底，避免漏配父级导致 ellipsis 不生效。
 */
export const truncateSingleLine: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

/**
 * 多行 clamp 样式：限制最多 lines 行，超出部分省略号截断。
 *
 * 同时带 overflowWrap/wordBreak:break-word，确保超长连续串（如无空格的
 * 长字母数字串）能在框内换行而非横向撑破容器。
 *
 * @param lines 最大显示行数（≥1）
 */
export function clampLines(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  };
}
