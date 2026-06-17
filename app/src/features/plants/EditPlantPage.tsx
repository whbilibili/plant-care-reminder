import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Leaf } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FormError } from "../../components/ui/FormError";
import { GroupedSurface } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { ObjectSummaryBand } from "../../components/ui/ObjectSummaryBand";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

      {/* ObjectSummaryBand — 上下文摘要 */}
      <div style={summaryWrapStyle}>
        <GroupedSurface>
          <ObjectSummaryBand
            thumbnail={
              <StorageImage
                alt={form.values.name || "植物"}
                fallback={
                  <div style={thumbFallbackStyle}>
                    <Icon icon={Leaf} size={24} colorVar="--color-leaf" />
                  </div>
                }
                initialUrl={plant.imagePreviewUrl ?? null}
                storageId={plant.imageStorageId ?? null}
                style={thumbImageStyle}
              />
            }
            title={form.values.name || "未命名植物"}
            subtitle={form.values.location ? `📍 ${form.values.location}` : undefined}
          />
        </GroupedSurface>
      </div>

      {/* 安静表单 — 字段直接平铺 */}
      <PlantForm form={form} submitLabel="更新植物" />

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
  background: "transparent",
  color: "var(--color-leaf)",
  fontSize: "16px",
  fontWeight: 600,
  padding: "var(--space-xs) var(--space-sm)",
  cursor: "pointer",
};

const summaryWrapStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-sm)",
};

const thumbFallbackStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const thumbImageStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  objectFit: "cover",
  borderRadius: "var(--radius-button)",
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
