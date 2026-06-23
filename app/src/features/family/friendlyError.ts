/**
 * 将 Convex mutation 抛出的英文错误映射为用户友好的中文提示。
 *
 * Convex 的 error.message 格式通常为：
 *   [CONVEX M(families:xxx)] [Request ID: ...] Server Error Uncaught Error: <原始消息> at handler ...
 * 本函数从中提取 "Uncaught Error: " 后面的原始消息进行匹配。
 */

const ERROR_MAP: Record<string, string> = {
  "You already belong to a family.": "你已经加入了一个家庭，无法重复创建",
  "You must be signed in to create a family.": "请先登录后再创建家庭",
  "Family name is required.": "请输入家庭名称",
  "You must be signed in to join a family.": "请先登录后再加入家庭",
  "Invite code is required.": "请输入邀请码",
  "That invite code does not match any household.": "邀请码无效，请检查后重新输入",
  "You are already a member of this family.": "你已经是这个家庭的成员了",
  "Unable to generate a unique invite code. Please try again.": "邀请码生成失败，请重试",
};

function extractCoreMessage(raw: string): string {
  // 尝试从 Convex 格式中提取 "Uncaught Error: <msg>" 部分
  const match = raw.match(/Uncaught Error:\s*(.+?)(?:\s*at handler|\s*at async| Called by)/);
  if (match?.[1]) {
    return match[1].trim();
  }
  return raw;
}

export function friendlyError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const core = extractCoreMessage(error.message);

  // 精确匹配
  if (ERROR_MAP[core]) {
    return ERROR_MAP[core];
  }

  // 模糊匹配：遍历 key 看是否被包含
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (core.includes(key) || error.message.includes(key)) {
      return value;
    }
  }

  // 如果提取出的 core 与原始 message 不同，说明成功从 Convex 格式中
  // 解析出了业务错误消息，直接使用（适用于后端已写好中文提示的场景）
  if (core !== error.message && core.length > 0 && core.length < 100) {
    return core;
  }

  return fallback;
}
