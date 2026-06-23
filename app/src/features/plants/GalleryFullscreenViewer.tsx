import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { GalleryItem } from "../../types/domain";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { showToast } from "../../components/ui/GlobalToast";

interface GalleryFullscreenViewerProps {
  gallery: GalleryItem[];
  initialIndex: number;
  isArchived: boolean;
  onClose: () => void;
  onDelete: (imageStorageId: string) => void;
  onSetCover: (imageStorageId: string) => void;
  onUpdateCaption?: (imageStorageId: string, caption: string | undefined) => void;
}

/**
 * 图集全屏浏览模式（GAL-014）。
 * 全黑背景 + 左右滑动 + 删除确认 + 设为封面。
 */
export function GalleryFullscreenViewer({
  gallery,
  initialIndex,
  isArchived,
  onClose,
  onDelete,
  onSetCover,
  onUpdateCaption,
}: GalleryFullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, gallery.length - 1),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  // 备注编辑状态
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const captionInputRef = useRef<HTMLInputElement>(null);

  const currentItem = gallery[currentIndex];

  // 预加载当前和前后各 1 张原图
  useEffect(() => {
    const indices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
      (i) => i >= 0 && i < gallery.length,
    );

    for (const idx of indices) {
      const item = gallery[idx];
      if (!imageUrls.has(item.imageStorageId)) {
        // 使用 thumbnailUrl 作为全屏图（实际项目中应使用原图 URL，
        // 但当前 getPlantDetail 只返回 thumbnailUrl，先用它展示）
        if (item.thumbnailUrl) {
          setImageUrls((prev) => {
            const next = new Map(prev);
            next.set(item.imageStorageId, item.thumbnailUrl!);
            return next;
          });
        }
      }
    }
  }, [currentIndex, gallery, imageUrls]);

  // 滚动到初始位置
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: initialIndex * window.innerWidth,
        behavior: "instant",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理滚动结束事件
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < gallery.length) {
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, gallery.length]);

  // 删除确认
  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    onDelete(currentItem.imageStorageId);
    setShowDeleteConfirm(false);

    // 如果删除的是最后一张，自动退出全屏
    if (gallery.length <= 1) {
      onClose();
      return;
    }

    // 调整 index
    if (currentIndex >= gallery.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  // 设为封面 — 直接执行 + toast，无二次确认
  const handleSetCover = () => {
    if (!currentItem) return;
    onSetCover(currentItem.imageStorageId);
    setShowActions(false);
    showToast("已设为封面");
  };

  // 日期格式化
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (!currentItem) {
    onClose();
    return null;
  }

  return (
    <div style={overlayStyle}>
      {/* 顶栏 */}
      <div style={topBarStyle}>
        <button
          aria-label="返回"
          onClick={onClose}
          style={iconButtonStyle}
          type="button"
        >
          <ChevronLeft size={24} color="var(--color-paper)" />
        </button>

        <div style={topRightStyle}>
          {!isArchived && (
            <button
              aria-label="更多操作"
              onClick={() => setShowActions(!showActions)}
              style={iconButtonStyle}
              type="button"
            >
              <MoreHorizontal size={22} color="var(--color-paper)" />
            </button>
          )}
        </div>
      </div>

      {/* 图片滚动区 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={scrollAreaStyle}
      >
        {gallery.map((item) => {
          const url = imageUrls.get(item.imageStorageId) ?? item.thumbnailUrl;
          return (
            <div key={item.imageStorageId} style={slideStyle}>
              {url && (
                <img
                  alt=""
                  src={url}
                  style={imageStyle}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 底部信息区：日期 + 备注 + 计数 */}
      <div style={bottomBarStyle}>
        <div style={bottomInfoStyle}>
          <span style={dateTextStyle}>
            {formatDate(currentItem.uploadedAt)}
          </span>
          {/* 备注展示/编辑 */}
          {!isArchived && onUpdateCaption ? (
            editingCaption ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = captionDraft.trim();
                  onUpdateCaption(currentItem.imageStorageId, trimmed || undefined);
                  setEditingCaption(false);
                }}
                style={captionFormStyle}
              >
                <input
                  ref={captionInputRef}
                  autoFocus
                  maxLength={100}
                  onBlur={() => {
                    const trimmed = captionDraft.trim();
                    onUpdateCaption(currentItem.imageStorageId, trimmed || undefined);
                    setEditingCaption(false);
                  }}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="写点什么记录一下…"
                  style={captionInputStyle}
                  type="text"
                  value={captionDraft}
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setCaptionDraft(currentItem.caption ?? "");
                  setEditingCaption(true);
                }}
                style={captionDisplayStyle}
                type="button"
              >
                {currentItem.caption || "点击添加备注…"}
              </button>
            )
          ) : currentItem.caption ? (
            <span style={captionReadonlyStyle}>{currentItem.caption}</span>
          ) : null}
        </div>
        <span style={counterTextStyle}>
          {currentIndex + 1} / {gallery.length}
        </span>
      </div>

      {/* 更多操作菜单 — iOS 风格双块 ActionSheet */}
      {showActions && !isArchived && (
        <div style={actionSheetBackdropStyle} onClick={() => setShowActions(false)}>
          <div style={actionSheetContainerStyle} onClick={(e) => e.stopPropagation()}>
            {/* 操作组 */}
            <div style={actionSheetGroupStyle}>
              <button
                onClick={handleSetCover}
                style={actionItemStyle}
                type="button"
              >
                设为封面
              </button>
              <div style={actionSheetDividerStyle} />
              <button
                onClick={() => { setShowActions(false); setShowDeleteConfirm(true); }}
                style={{ ...actionItemStyle, color: "var(--color-danger, #e53e3e)" }}
                type="button"
              >
                删除照片
              </button>
            </div>
            {/* 取消按钮 — 独立圆角块 */}
            <div style={actionSheetGroupStyle}>
              <button
                onClick={() => setShowActions(false)}
                style={{ ...actionItemStyle, fontWeight: 600 }}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 Sheet */}
      {showDeleteConfirm && (
        <ConfirmSheet
          confirmLabel="删除"
          description="删除后无法恢复"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
          title="确定删除这张照片？"
          variant="danger-solid"
        />
      )}
    </div>
  );
}

// ─── 样式 ────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "var(--color-ink)",
  display: "flex",
  flexDirection: "column",
};

const topBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "env(safe-area-inset-top, 12px) var(--space-md) var(--space-sm)",
  zIndex: 10,
};

const topRightStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-sm)",
};

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "var(--space-sm)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const slideStyle: React.CSSProperties = {
  minWidth: "100%",
  height: "100%",
  scrollSnapAlign: "start",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imageStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  touchAction: "pinch-zoom",
};

const bottomBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  padding: "var(--space-md) var(--space-md) env(safe-area-inset-bottom, 16px)",
  zIndex: 10,
};

const bottomInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
  minWidth: 0,
};

const dateTextStyle: React.CSSProperties = {
  color: "var(--color-paper)",
  fontSize: "14px",
};

const counterTextStyle: React.CSSProperties = {
  color: "var(--color-paper)",
  fontSize: "14px",
  opacity: 0.7,
  flexShrink: 0,
};

const captionDisplayStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const captionReadonlyStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const captionFormStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
};

const captionInputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "8px",
  padding: "6px 10px",
  color: "var(--color-paper)",
  fontSize: "13px",
  outline: "none",
};

const actionSheetBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const actionSheetContainerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  padding: "0 var(--space-sm) env(safe-area-inset-bottom, 12px)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const actionSheetGroupStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "14px",
  overflow: "hidden",
};

const actionItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "16px",
  fontSize: "17px",
  color: "var(--color-ink)",
  cursor: "pointer",
  textAlign: "center",
  width: "100%",
};

const actionSheetDividerStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--color-border, rgba(0,0,0,0.08))",
  margin: "0 16px",
};
