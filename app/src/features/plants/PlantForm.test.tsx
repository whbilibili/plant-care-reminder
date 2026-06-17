import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlantForm } from "./PlantForm";
import { createPlantEditorValuesFromPlant, toPlantMutationPayload } from "./plantSchema";
import { usePlantForm } from "./usePlantForm";
import type { Plant } from "../../types/domain";

function PlantFormHarness({
  initialValue,
  onSubmit,
}: {
  initialValue?: NonNullable<Parameters<typeof usePlantForm>[0]>["initialValue"];
  onSubmit?: NonNullable<Parameters<typeof usePlantForm>[0]>["onSubmit"];
}) {
  const form = usePlantForm({
    initialValue,
    onSubmit,
  });

  return <PlantForm form={form} submitLabel="保存植物" />;
}

describe("Plant form contract", () => {
  it("validates the required plant name before submission", async () => {
    const onSubmit = vi.fn();

    render(<PlantFormHarness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /保存植物/i }));

    await waitFor(() =>
      expect(screen.getByText(/请填写植物名称。/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("normalizes optional text fields into a stable mutation payload", async () => {
    const onSubmit = vi.fn();

    render(<PlantFormHarness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/植物名称/i), {
      target: { value: "  Monstera deliciosa  " },
    });
    fireEvent.change(screen.getByLabelText(/简介/i), {
      target: { value: "  Bright indirect light.  " },
    });
    fireEvent.change(screen.getByLabelText(/养护备注/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/摆放位置/i), {
      target: { value: "  Dining room shelf " },
    });

    fireEvent.click(screen.getByRole("button", { name: /保存植物/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: "Monstera deliciosa",
          description: "Bright indirect light.",
          note: null,
          location: "Dining room shelf",
          imageStorageId: null,
        },
        expect.objectContaining({
          name: "  Monstera deliciosa  ",
          location: "  Dining room shelf ",
        }),
      ),
    );
  });

  it("can preload edit-mode values from an existing plant without shape conversion bugs", () => {
    const plant: Plant = {
      id: "plant_1",
      familyId: "family_1",
      name: "Bird of Paradise",
      description: "Tall leaves by the balcony.",
      notes: "Water every Saturday.",
      location: "Sunroom corner",
      imageStorageId: "storage_1",
      createdBy: "user_1",
      createdAt: 1,
      updatedAt: 2,
      isArchived: false,
      archivedAt: null,
    };

    const initialValue = createPlantEditorValuesFromPlant(
      plant,
      "https://cdn.test/bird-of-paradise.jpg",
    );

    expect(toPlantMutationPayload(initialValue)).toEqual({
      name: "Bird of Paradise",
      description: "Tall leaves by the balcony.",
      note: "Water every Saturday.",
      location: "Sunroom corner",
      imageStorageId: "storage_1",
    });

    render(
      <PlantFormHarness
        initialValue={{
          name: plant.name,
          description: plant.description,
          notes: plant.notes,
          location: plant.location,
          imageStorageId: plant.imageStorageId,
          imagePreviewUrl: "https://cdn.test/bird-of-paradise.jpg",
        }}
      />,
    );

    expect(screen.getByLabelText(/植物名称/i)).toHaveValue("Bird of Paradise");
    expect(screen.getByLabelText(/简介/i)).toHaveValue("Tall leaves by the balcony.");
    expect(screen.getByLabelText(/养护备注/i)).toHaveValue("Water every Saturday.");
    expect(screen.getByLabelText(/摆放位置/i)).toHaveValue("Sunroom corner");
    expect(screen.getByAltText(/已选植物封面预览/i)).toHaveAttribute(
      "src",
      "https://cdn.test/bird-of-paradise.jpg",
    );
  });
});
