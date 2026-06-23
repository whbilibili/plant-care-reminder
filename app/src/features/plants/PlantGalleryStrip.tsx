import { useEffect, useRef, useState } from "react";

import type { GalleryItem } from "../../types/domain";
import { GalleryAddButton } from "./GalleryAddButton";

interface PlantGalleryStripProps {
  gallery: GalleryItem[];
  isArchived: boolean;
  isFull: boolean;
  isUploading?: boolean;
  onAdd: () => void;
  onThumbnailPress: (index: number) => void;
}

const MAX_VISIBLE = 10;

/**
 * 图集横向滚动缩略图区（GAL-013）。
 * 展示最近 10 张 + 查看全部入口 + 空状态引导。
 */
export function PlantGalleryStrip({
  gallery,
  isArchived,
  isFull,
  isUploading,
  onAdd,
  onThumbnailPress,
}: PlantGalleryStripProps) {
  const visibleItems = gallery.slice(0, MAX_VISIBLE);
  const hasMore = gallery.length > MAX_VISIBLE;
  const isEmpty = gallery.length === 0;

  return (
    <section style={sectionStyle}>
      <div style={scrollContainerStyle}>
        {/* 添加按钮（归档时不展示） */}
        {!isArchived && <GalleryAddButton disabled={isFull} isLoading={isUploading} onClick={onAdd} />}

        {/* 空状态引导 */}
        {isEmpty && !isArchived && (
          <p style={emptyHintStyle}>记录植物的成长变化</p>
        )}

        {/* 缩略图列表 */}
        {visibleItems.map((item, index) => (
          <ThumbnailCard
            key={item.imageStorageId}
            item={item}
            onClick={() => onThumbnailPress(index)}
          />
        ))}

        {/* 查看全部入口 */}
        {hasMore && (
          <button
            onClick={() => onThumbnailPress(MAX_VISIBLE)}
            style={viewAllCardStyle}
            type="button"
          >
            <span style={viewAllTextStyle}>
              查看全部({gallery.length})
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

// ─── 缩略图卡片（懒加载）────────────────────────────────────

interface ThumbnailCardProps {
  item: GalleryItem;
  onClick: () => void;
}

function ThumbnailCard({ item, onClick }: ThumbnailCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      aria-label="查看图片"
      onClick={onClick}
      style={thumbnailButtonStyle}
      type="button"
    >
      {isVisible && item.thumbnailUrl && (
        <img
          alt=""
          loading="lazy"
          src={item.thumbnailUrl}
          style={thumbnailImageStyle}
        />
      )}
    </button>
  );
}

// ─── 样式 ────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
};

const scrollContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  overflowX: "auto",
  paddingBottom: "var(--space-xs)",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const emptyHintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  whiteSpace: "nowrap",
};

const thumbnailButtonStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  minWidth: "80px",
  borderRadius: "var(--space-sm)",
  overflow: "hidden",
  border: "none",
  padding: 0,
  background: "var(--color-mist)",
  cursor: "pointer",
};

const thumbnailImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const viewAllCardStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  minWidth: "80px",
  borderRadius: "var(--space-sm)",
  background: "var(--color-mist)",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: "var(--space-xs)",
};

const viewAllTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  textAlign: "center",
  lineHeight: 1.3,
};
