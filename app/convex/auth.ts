import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile: (params) => {
        const email = params.email;
        if (typeof email !== "string" || email.trim().length === 0) {
          throw new Error("Email is required");
        }

        const now = Date.now();
        return {
          email: normalizeEmail(email),
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
});
