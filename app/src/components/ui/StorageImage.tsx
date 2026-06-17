import { useConvex } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { StorageId } from "../../types/domain";

interface StorageImageProps {
  alt: string;
  fallback: React.ReactNode;
  initialUrl?: string | null;
  storageId?: StorageId | null;
  style?: React.CSSProperties;
  /**
   * D1：自定义 storageId → URL 解析器。默认走 plants.getPlantImageUrl 以保证
   * 植物图片调用方零回归；头像等其他场景可注入自己的解析回调。
   */
  fetchUrl?: (storageId: StorageId) => Promise<{ imageUrl: string | null }>;
}

export function StorageImage({
  alt,
  fallback,
  initialUrl = null,
  storageId = null,
  style,
  fetchUrl,
}: StorageImageProps) {
  const convex = useConvex();

  const resolveUrl = useCallback(
    (id: StorageId) =>
      fetchUrl
        ? fetchUrl(id)
        : convex.query(api.plants.getPlantImageUrl, { storageId: id as never }),
    [convex, fetchUrl],
  );
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [hasFailed, setHasFailed] = useState(false);
  const [hasRetried, setHasRetried] = useState(false);

  useEffect(() => {
    setImageUrl(initialUrl);
    setHasFailed(false);
    setHasRetried(false);
  }, [initialUrl, storageId]);

  useEffect(() => {
    if (imageUrl || !storageId || hasRetried) {
      return;
    }

    let isCancelled = false;

    void resolveUrl(storageId)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setImageUrl(result.imageUrl);
        setHasFailed(false);
        setHasRetried(true);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setHasFailed(true);
        setHasRetried(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [hasRetried, imageUrl, resolveUrl, storageId]);

  async function handleImageError() {
    if (!storageId || hasRetried) {
      setHasFailed(true);
      return;
    }

    try {
      const result = await resolveUrl(storageId);
      setImageUrl(result.imageUrl);
      setHasRetried(true);
      setHasFailed(false);
    } catch {
      setHasFailed(true);
      setHasRetried(true);
    }
  }

  if (!imageUrl || hasFailed) {
    return <>{fallback}</>;
  }

  // HEIC 等浏览器无法解码的格式：图片会“加载完成”（complete 为 true）但
  // naturalWidth 为 0，且不会触发 error 事件。若图片来自缓存，挂载时往往
  // 已经 complete，onLoad 不再触发，因此用 ref 在挂载/更新时主动检测。
  const markFailedIfUndecodable = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) {
      setHasFailed(true);
    }
  };

  return (
    <img
      ref={markFailedIfUndecodable}
      alt={alt}
      onError={() => void handleImageError()}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth === 0) {
          setHasFailed(true);
        }
      }}
      src={imageUrl}
      style={style}
    />
  );
}
