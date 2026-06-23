import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Leaf, MapPin } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FormError } from "../../components/ui/FormError";
import {
  FormSummaryCard,
  formSummaryThumbFallbackStyle,
  formSummaryThumbImageStyle,
} from "../../components/ui/FormSummaryCard";
import { Icon } from "../../components/ui/Icon";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { StorageImage } from "../../components/ui/StorageImage";
import { navigate } from "../../app/router";
import { PlantForm } from "./PlantForm";
import { usePlantForm } from "./usePlantForm";

interface EditPlantPageProps {
  plantId: string | null;
}

export function EditPlantPage({ plantId }: EditPlantPageProps) {
  const updatePlant = useMutation(api.plants.updatePlant);
  const plant = useQuery(
    api.plants.getPlantForEdit,
    plantId
      ? {
          plantId: plantId as Id<"plants">,
        }
      : "skip",
  );
  const plantsData = useQuery(api.plants.listPlantsWithNextDue, {});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** 从已有植物中提取去重位置建议（按频率降序）。 */
  const locationSuggestions = useMemo(() => {
    if (!plantsData?.plants) return [];
    const freq = new Map<string, number>();
    for (const p of plantsData.plants) {
      if (p.location) {
        freq.set(p.location, (freq.get(p.location) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc);
  }, [plantsData]);
  const form = usePlantForm({
    initialValue: plant ?? null,
    onSubmit: async (payload) => {
      if (!plantId) {
        setErrorMessage("编辑这条植物记录时缺少植物 ID。");
        return;
      }

      setErrorMessage(null);

      try {
        await updatePlant({
          plantId: plantId as Id<"plants">,
          ...payload,
          imageStorageId: payload.imageStorageId as Id<"_storage"> | null,
        });
        navigate("/plants", true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "当前无法更新这盆植物，请稍后再试。",
        );
      }
    },
  });

  if (!plantId) {
    return <PlantEditError message="打开编辑器时缺少植物 ID。" />;
  }

  if (plant === undefined) {
    return <PlantEditLoading plantId={plantId} />;
  }

  if (plant === null) {
    return <PlantEditError message="在当前家庭中没有找到这盆植物。" />;
  }

  return (
    <section style={pageStyle}>
      {/* ScreenNav — 轻量导航 */}
      <ScreenNav
        title="编辑植物"
        onBack={() => navigate(`/plants/${plantId}`, true)}
        rightAction={
          <button
            disabled={form.isSubmitting}
            onClick={() => void form.handleSubmit()}
            style={{
              ...saveButtonStyle,
              opacity: form.isSubmitting ? 0.6 : 1,
              cursor: form.isSubmitting ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            保存
          </button>
        }
      />

      {/* 摘要卡片 */}
      <FormSummaryCard
        thumbnail={
          <StorageImage
            alt={form.values.name || "植物"}
            fallback={
              <div style={formSummaryThumbFallbackStyle}>
                <Icon icon={Leaf} size={24} colorVar="--color-leaf" />
              </div>
            }
            initialUrl={plant.imagePreviewUrl ?? null}
            storageId={plant.imageStorageId ?? null}
            style={formSummaryThumbImageStyle}
          />
        }
        title={form.values.name || "未命名植物"}
        subtitle={
          form.values.location ? (
            <>
              <Icon icon={MapPin} size={13} colorVar="--color-muted" />
              {form.values.location}
            </>
          ) : undefined
        }
        description={form.values.description ? form.values.description.slice(0, 40) + (form.values.description.length > 40 ? "…" : "") : undefined}
      />

      {/* 精致表单 — 字段分组卡片化 */}
      <PlantForm form={form} submitLabel="更新植物" locationSuggestions={locationSuggestions} />

      <div style={bottomErrorStyle}>
        <FormError message={errorMessage} />
      </div>
    </section>
  );
}

function PlantEditLoading({ plantId }: { plantId: string }) {
  return (
    <section style={pageStyle}>
      <ScreenNav
        title="编辑植物"
        onBack={() => navigate(`/plants/${plantId}`, true)}
      />
      <div style={loadingStyle}>
        <p style={loadingTextStyle}>正在加载植物资料…</p>
      </div>
    </section>
  );
}

function PlantEditError({ message }: { message: string }) {
  return (
    <section style={pageStyle}>
      <ScreenNav
        title="编辑植物"
        onBack={() => navigate("/plants", true)}
      />
      <div style={errorCardStyle}>
        <p style={errorTitleStyle}>植物编辑不可用</p>
        <p style={errorBodyStyle}>{message}</p>
      </div>
    </section>
  );
}

/* ─── Styles ─── */

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100dvh",
  background: "var(--color-paper)",
};

const saveButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "var(--color-leaf)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "6px 16px",
  borderRadius: "var(--radius-pill)",
  boxShadow: "0 2px 6px rgba(31,71,61,0.18)",
  cursor: "pointer",
};


const bottomErrorStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md) var(--space-lg)",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-xl)",
};

const loadingTextStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "14px",
};

const errorCardStyle: React.CSSProperties = {
  padding: "var(--space-lg) var(--space-md)",
  display: "grid",
  gap: "var(--space-sm)",
};

const errorTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const errorBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.6,
};
