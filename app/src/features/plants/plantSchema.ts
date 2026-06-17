import {
  PLANT_DESCRIPTION_MAX_LENGTH,
  PLANT_LOCATION_MAX_LENGTH,
  PLANT_NAME_MAX_LENGTH,
  PLANT_NOTE_MAX_LENGTH,
} from "../../lib/constants";
import type { Plant, StorageId } from "../../types/domain";
import type { PlantImageValue } from "./PlantImageField";

export interface PlantEditorValues {
  description: string;
  image: PlantImageValue;
  location: string;
  name: string;
  note: string;
}

export interface PlantFormErrors {
  description?: string;
  image?: string;
  location?: string;
  name?: string;
  note?: string;
}

export interface PlantEditorSource {
  description?: string | null;
  imagePreviewUrl?: string | null;
  imageStorageId?: StorageId | null;
  location?: string | null;
  name?: string | null;
  note?: string | null;
  notes?: string | null;
}

export interface PlantMutationPayload {
  description: string | null;
  imageStorageId: StorageId | null;
  location: string | null;
  name: string;
  note: string | null;
}

export const emptyPlantImageValue: PlantImageValue = {
  previewUrl: null,
  storageId: null,
};

export function createEmptyPlantEditorValues(): PlantEditorValues {
  return {
    name: "",
    description: "",
    note: "",
    location: "",
    image: emptyPlantImageValue,
  };
}

export function createPlantEditorValues(
  source: PlantEditorSource | null | undefined,
): PlantEditorValues {
  if (!source) {
    return createEmptyPlantEditorValues();
  }

  return {
    name: source.name ?? "",
    description: source.description ?? "",
    note: source.note ?? source.notes ?? "",
    location: source.location ?? "",
    image: {
      previewUrl: source.imagePreviewUrl ?? null,
      storageId: source.imageStorageId ?? null,
    },
  };
}

export function createPlantEditorValuesFromPlant(
  plant: Plant,
  imagePreviewUrl?: string | null,
): PlantEditorValues {
  return createPlantEditorValues({
    name: plant.name,
    description: plant.description,
    notes: plant.notes,
    location: plant.location,
    imageStorageId: plant.imageStorageId,
    imagePreviewUrl,
  });
}

export function normalizePlantEditorText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function validatePlantEditorValues(values: PlantEditorValues): PlantFormErrors {
  const errors: PlantFormErrors = {};

  if (!normalizePlantEditorText(values.name)) {
    errors.name = "请填写植物名称。";
  } else if (values.name.length > PLANT_NAME_MAX_LENGTH) {
    errors.name = `植物名称不能超过 ${PLANT_NAME_MAX_LENGTH} 个字符。`;
  }

  if (values.location.length > PLANT_LOCATION_MAX_LENGTH) {
    errors.location = `摆放位置不能超过 ${PLANT_LOCATION_MAX_LENGTH} 个字符。`;
  }

  if (values.description.length > PLANT_DESCRIPTION_MAX_LENGTH) {
    errors.description = `简介不能超过 ${PLANT_DESCRIPTION_MAX_LENGTH} 个字符。`;
  }

  if (values.note.length > PLANT_NOTE_MAX_LENGTH) {
    errors.note = `养护备注不能超过 ${PLANT_NOTE_MAX_LENGTH} 个字符。`;
  }

  return errors;
}

export function hasPlantFormErrors(errors: PlantFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function toPlantMutationPayload(values: PlantEditorValues): PlantMutationPayload {
  const name = normalizePlantEditorText(values.name);
  if (!name) {
    throw new Error("请填写植物名称。");
  }

  return {
    name,
    description: normalizePlantEditorText(values.description),
    note: normalizePlantEditorText(values.note),
    location: normalizePlantEditorText(values.location),
    imageStorageId: values.image.storageId,
  };
}
