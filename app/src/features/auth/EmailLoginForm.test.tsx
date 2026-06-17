import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmailLoginForm } from "./EmailLoginForm";
import { setMockSignInHandler } from "../../test/setup";

describe("EmailLoginForm", () => {
  it("maps backend credential lookup errors to a user-facing message", async () => {
    setMockSignInHandler(
      vi.fn().mockRejectedValue(new Error("InvalidAccountId")),
    );

    render(<EmailLoginForm />);

    // Use IDs to target fields since labels now contain icons
    fireEvent.change(document.getElementById("auth-email")!, {
      target: { value: "user@example.com" },
    });
    fireEvent.change(document.getElementById("auth-password")!, {
      target: { value: "password123" },
    });

    // Multiple buttons have "登录" text (segmented tab + submit); pick the submit one.
    const allLoginButtons = screen.getAllByRole("button", { name: /登录/i });
    const submitBtn = allLoginButtons.find(
      (btn) => btn.getAttribute("type") === "submit",
    ) ?? allLoginButtons[allLoginButtons.length - 1];
    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(
        screen.getByText(/邮箱或密码不正确，请检查后重试/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/invalidaccountid/i)).not.toBeInTheDocument();
  });
});
