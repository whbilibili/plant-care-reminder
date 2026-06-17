import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlantImageField } from "./PlantImageField";
import { setMockConvexQueryHandler, setMockMutationHandler } from "../../test/setup";

const originalFetch = globalThis.fetch;

describe("PlantImageField", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uploads a selected file and returns a storage id plus preview url", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      uploadUrl: "https://upload.test/plant-image",
    });
    const onChange = vi.fn();

    setMockMutationHandler(mutationHandler);
    setMockConvexQueryHandler(
      vi.fn().mockResolvedValue({
        imageUrl: "https://cdn.test/plant-image.jpg",
      }),
    );
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        storageId: "storage_1",
      }),
    }) as typeof fetch;

    render(
      <PlantImageField
        onChange={onChange}
        value={{
          previewUrl: null,
          storageId: null,
        }}
      />,
    );

    const fileInput = screen.getByLabelText(/植物封面图/i);
    const file = new File(["leaf"], "monstera.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        previewUrl: "https://cdn.test/plant-image.jpg",
        storageId: "storage_1",
      }),
    );

    expect(mutationHandler).toHaveBeenCalledWith({});
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://upload.test/plant-image",
      expect.objectContaining({
        body: file,
        method: "POST",
      }),
    );
  });

  it("keeps the previous preview when upload fails", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      uploadUrl: "https://upload.test/plant-image",
    });
    const onChange = vi.fn();

    setMockMutationHandler(mutationHandler);
    setMockConvexQueryHandler(vi.fn());
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as typeof fetch;

    render(
      <PlantImageField
        onChange={onChange}
        value={{
          previewUrl: "https://cdn.test/current.jpg",
          storageId: "storage_current",
        }}
      />,
    );

    const fileInput = screen.getByLabelText(/植物封面图/i);
    const file = new File(["leaf"], "fern.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /植物图片上传失败，请稍后再试。/i,
      ),
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByAltText(/已选植物封面预览/i)).toHaveAttribute(
      "src",
      "https://cdn.test/current.jpg",
    );
  });
});
