import { useState } from "react";

import { PlantAvatar } from "./PlantAvatar";

interface PlantImageProps {
  alt: string;
  imageUrl: string | null;
  /** 植物名称，用于 PlantAvatar aria-label。 */
  plantName?: string;
  /** 头像槽边长（px），用于 PlantAvatar 尺寸。 */
  slotSize?: number;
}

/**
 * Plant thumbnail with fade-in on load and graceful error fallback.
 * Renders at 80×80 with 12px border-radius (matches PlantCard image slot).
 */
export function PlantImage({ alt, imageUrl, plantName = "植物", slotSize = 80 }: PlantImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    imageUrl ? "loading" : "error",
  );

  if (!imageUrl || status === "error") {
    return <PlantAvatar name={plantName} size={slotSize} />;
  }

  return (
    <div style={wrapStyle}>
      <PlantAvatar name={plantName} size={slotSize} />
      <img
        alt={alt}
        onError={() => setStatus("error")}
        onLoad={() => setStatus("loaded")}
        src={imageUrl}
        style={{
          ...imgStyle,
          opacity: status === "loaded" ? 1 : 0,
        }}
      />
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const imgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "12px",
  transition: "opacity 200ms ease-in",
};
