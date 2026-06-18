import { useConvex } from "convex/react";
import type { CSSProperties } from "react";
import { User } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Icon } from "../../components/ui/Icon";
import { StorageImage } from "../../components/ui/StorageImage";
import type { StorageId } from "../../types/domain";

/** 头像底色池：同人按 displayName hash 取模轮换，保证颜色稳定。 */
const AVATAR_COLORS = [
  "var(--color-leaf)",
  "var(--color-leaf-light)",
  "var(--color-task-misting)",
  "var(--color-task-pruning)",
  "var(--color-task-fertilizing)",
];

/** 稳定字符串 hash（djb2 变体），用于按名字取色。 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 取首字：中文取首字，英文取首字母大写。 */
function getInitial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  const first = Array.from(trimmed)[0];
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

/** 支持的头像尺寸（px）。默认 36，养护记录行用 24。 */
type AvatarSize = 24 | 28 | 36;

interface MemberAvatarProps {
  /** 成员显示名；为空/空白时兜底 👤。 */
  name: string | null | undefined;
  /** 用户头像 storageId（SET3-009）；有值时渲染真实头像，无值回退首字母色块。 */
  imageStorageId?: StorageId | null;
  /** 头像尺寸（px），默认 36。 */
  size?: AvatarSize;
}

/**
 * 成员头像（SET2-010 / SET3-009）：36×36 圆形头像。
 * 有 imageStorageId 时渲染真实头像（注入 users.getAvatarUrl 解析），
 * 加载失败或无值时回退到首字头像：底色按 displayName hash 取模从色池轮换，
 * 保证同人颜色稳定；无名兜底 👤 + --color-muted。纯装饰，aria-hidden。
 */
export function MemberAvatar({ name, imageStorageId = null, size = 36 }: MemberAvatarProps) {
  const convex = useConvex();
  const trimmed = name?.trim() ?? "";
  const initial = getInitial(trimmed);

  const sizeOverride = sizeStyles[size];

  const fallback =
    initial.length === 0 ? (
      <span aria-hidden="true" style={{ ...avatarStyle, ...sizeOverride, ...fallbackStyle }}>
        <Icon icon={User} size={size <= 24 ? 14 : 20} colorVar="--color-muted" />
      </span>
    ) : (
      <span
        aria-hidden="true"
        style={{
          ...avatarStyle,
          ...sizeOverride,
          background: AVATAR_COLORS[hashString(trimmed) % AVATAR_COLORS.length],
        }}
      >
        {initial}
      </span>
    );

  if (!imageStorageId) {
    return fallback;
  }

  return (
    <StorageImage
      alt=""
      fallback={fallback}
      storageId={imageStorageId}
      style={{ ...imageStyle, ...sizeOverride }}
      fetchUrl={async (id) => {
        const { url } = await convex.query(api.users.getAvatarUrl, {
          storageId: id as never,
        });
        return { imageUrl: url };
      }}
    />
  );
}

const avatarStyle: CSSProperties = {
  flex: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  color: "var(--color-paper)",
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1,
  userSelect: "none",
};

const imageStyle: CSSProperties = {
  flex: "none",
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  objectFit: "cover",
  display: "block",
};

const fallbackStyle: CSSProperties = {
  background: "var(--color-mist)",
  color: "var(--color-muted)",
  fontSize: "18px",
};

/** 尺寸变体覆盖样式。 */
const sizeStyles: Record<AvatarSize, CSSProperties> = {
  24: { width: "24px", height: "24px", fontSize: "11px" },
  28: { width: "28px", height: "28px", fontSize: "12px" },
  36: { /* 默认，不覆盖 */ },
};
