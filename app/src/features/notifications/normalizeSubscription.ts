interface PushSubscriptionPayload {
  endpoint: string;
  keys?: {
    auth?: string | null;
    p256dh?: string | null;
  } | null;
}

export function normalizeSubscription(payload: PushSubscriptionPayload) {
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) {
    throw new Error("Push subscription payload is missing endpoint or encryption keys.");
  }

  return {
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
  };
}
