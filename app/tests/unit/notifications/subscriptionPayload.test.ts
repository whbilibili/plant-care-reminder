import { describe, expect, it } from "vitest";

import { normalizeSubscription } from "../../../src/features/notifications/normalizeSubscription";

describe("normalizeSubscription", () => {
  it("extracts endpoint and keys from a PushSubscription JSON payload", () => {
    expect(
      normalizeSubscription({
        endpoint: "https://example.test/subscriptions/1",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    ).toEqual({
      endpoint: "https://example.test/subscriptions/1",
      p256dh: "p256dh-key",
      auth: "auth-key",
    });
  });
});
