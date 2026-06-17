import { Sprout } from "lucide-react";

import { Icon } from "../../components/ui/Icon";

interface PlantAvatarProps {
  /** 植物名称，用于 aria-label。 */
  name: string;
  /** 槽位边长（px），默认 80。 */
  size?: number;
}

/**
 * 无图植物的默认头像（方案 C）：botanical 渐变底 + lucide Sprout 线性图标。
 *
 * - 尺寸自适应：图标 = size × 0.45。
 * - 颜色全走 token，零 hex。
 * - 供 PlantImage / PlantHeroCard / StorageImage fallback 共用。
 */
export function PlantAvatar({ name, size = 80 }: PlantAvatarProps) {
  const iconSize = Math.round(size * 0.45);

  return (
    <div
      aria-label={`${name} 默认头像`}
      role="img"
      style={{
        ...containerStyle,
        width: size,
        height: size,
      }}
    >
      <Icon
        icon={Sprout}
        size={iconSize}
        strokeWidth={1.75}
        colorVar="--color-leaf"
      />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--gradient-botanical)",
  borderRadius: "inherit",
};
