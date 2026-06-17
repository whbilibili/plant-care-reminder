import { useEffect, useState } from "react";

import type { PlantImageValue } from "./PlantImageField";
import {
  createPlantEditorValues,
  hasPlantFormErrors,
  toPlantMutationPayload,
  validatePlantEditorValues,
  type PlantEditorSource,
  type PlantEditorValues,
  type PlantFormErrors,
  type PlantMutationPayload,
} from "./plantSchema";

type PlantFieldName = Exclude<keyof PlantEditorValues, "image">;

interface UsePlantFormOptions {
  initialValue?: PlantEditorSource | null;
  onSubmit?: (payload: PlantMutationPayload, values: PlantEditorValues) => Promise<void> | void;
}

export interface PlantFormController {
  errors: PlantFormErrors;
  handleSubmit: (event?: React.FormEvent<HTMLFormElement>) => Promise<PlantMutationPayload | null>;
  isSubmitting: boolean;
  resetForm: (nextValue?: PlantEditorSource | null) => void;
  setFieldValue: (field: PlantFieldName, value: string) => void;
  setImageValue: (value: PlantImageValue) => void;
  values: PlantEditorValues;
}

export function usePlantForm({
  initialValue = null,
  onSubmit,
}: UsePlantFormOptions = {}): PlantFormController {
  const [values, setValues] = useState<PlantEditorValues>(() =>
    createPlantEditorValues(initialValue),
  );
  const [errors, setErrors] = useState<PlantFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(createPlantEditorValues(initialValue));
    setErrors({});
    setIsSubmitting(false);
  }, [initialValue]);

  const setFieldValue = (field: PlantFieldName, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });
  };

  const setImageValue = (value: PlantImageValue) => {
    setValues((currentValues) => ({
      ...currentValues,
      image: value,
    }));
  };

  const resetForm = (nextValue?: PlantEditorSource | null) => {
    setValues(createPlantEditorValues(nextValue));
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (
    event?: React.FormEvent<HTMLFormElement>,
  ): Promise<PlantMutationPayload | null> => {
    event?.preventDefault();

    const nextErrors = validatePlantEditorValues(values);
    setErrors(nextErrors);

    if (hasPlantFormErrors(nextErrors)) {
      return null;
    }

    const payload = toPlantMutationPayload(values);

    if (!onSubmit) {
      return payload;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(payload, values);
      return payload;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    isSubmitting,
    setFieldValue,
    setImageValue,
    resetForm,
    handleSubmit,
  };
}
