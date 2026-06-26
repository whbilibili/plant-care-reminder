import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FormError } from "../../components/ui/FormError";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { navigate } from "../../app/router";
import { PlantForm } from "./PlantForm";
import { markCreatePlantSuccess } from "./createPlantSuccess";
import { usePlantForm } from "./usePlantForm";
import type { RecommendApplyPayload } from "./SpeciesRecommendCard";

export function CreatePlantPage() {
  const createPlant = useMutation(api.plants.createPlant);
  const plantsData = useQuery(api.plants.listPlantsWithNextDue, {});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // KNOW-007: 物种关联状态
  const speciesIdRef = useRef<string | null>(null);

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
  const handleSpeciesChange = useCallback((id: string | null) => {
    speciesIdRef.current = id;
  }, []);

  const handleRecommendApply = useCallback((_payload: RecommendApplyPayload) => {
    // 推荐参数应用逻辑由 PlantForm 内部展示，这里仅确保 speciesId 已设置
    // 未来可以在此处自动填充任务排期参数
  }, []);

  const form = usePlantForm({
    onSubmit: async (payload) => {
      setErrorMessage(null);

      try {
        await createPlant({
          ...payload,
          imageStorageId: payload.imageStorageId as Id<"_storage"> | null,
          speciesId: speciesIdRef.current ?? undefined,
        });
        markCreatePlantSuccess();
        navigate("/plants", true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "当前无法保存这盆植物，请稍后再试。",
        );
      }
    },
  });

  return (
    <section style={pageStyle}>
      <ScreenNav
        title="添加植物"
        onBack={() => navigate("/plants", true)}
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
      <PlantForm
        form={form}
        submitLabel="保存植物"
        locationSuggestions={locationSuggestions}
        onSpeciesChange={handleSpeciesChange}
        onRecommendApply={handleRecommendApply}
        mode="create"
      />
      <div style={bottomErrorStyle}>
        <FormError message={errorMessage} />
      </div>
    </section>
  );
}

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
