import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { normalizeSubscription } from "./normalizeSubscription";

interface PushSubscriptionLike {
  toJSON: () => {
    endpoint: string;
    keys?: {
      auth?: string | null;
      p256dh?: string | null;
    } | null;
  };
}

/**
 * 通知卡片的可视化状态。enabled/disabled/unsupported 对应 VIS-012 设计契约的三态，
 * needs_install 为 iOS Safari 安装引导的额外兜底分支（见 docs/caveats.md）。
 */
type VisualState = "enabled" | "disabled" | "unsupported" | "needs_install";

function isStandaloneDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIosSafariInstallCandidate() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
  const isWebkitBrowser = /safari/.test(userAgent) && !/crios|fxios/.test(userAgent);

  return isIosDevice && isWebkitBrowser && !isStandaloneDisplayMode();
}

function deriveDeviceLabel() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone/.test(userAgent)) {
    return isStandaloneDisplayMode() ? "iPhone 主屏幕应用" : "iPhone 浏览器";
  }

  if (/ipad/.test(userAgent)) {
    return isStandaloneDisplayMode() ? "iPad 主屏幕应用" : "iPad 浏览器";
  }

  if (/macintosh/.test(userAgent)) {
    return "Mac 浏览器";
  }

  return "家庭设备";
}

function toApplicationServerKey(value: string) {
  const paddedValue = value.padEnd(Math.ceil(value.length / 4) * 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const decodedValue = window.atob(paddedValue);

  return Uint8Array.from(decodedValue, (character) => character.charCodeAt(0));
}

export function NotificationPromptCard() {
  const savePushSubscription = useMutation(api.notifications.savePushSubscription);
  const [status, setStatus] = useState<"idle" | "pending" | "enabled" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const capability = useMemo(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      return "unsupported" as const;
    }

    if (isIosSafariInstallCandidate()) {
      return "needs_install" as const;
    }

    return "supported" as const;
  }, []);

  // 将 capability + 交互 status 归一为设计契约约定的可视化三态（+needs_install 兜底）。
  const visualState: VisualState = useMemo(() => {
    if (capability === "unsupported") {
      return "unsupported";
    }

    if (capability === "needs_install") {
      return "needs_install";
    }

    const alreadyGranted =
      "Notification" in window && Notification.permission === "granted";

    return status === "enabled" || alreadyGranted ? "enabled" : "disabled";
  }, [capability, status]);

  async function handleEnableNotifications() {
    if (capability !== "supported" || status === "pending") {
      return;
    }

    setStatus("pending");
    setErrorMessage(null);

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("error");
        setErrorMessage(
          permission === "denied"
            ? "当前设备的浏览器设置已阻止通知权限。"
            : "通知授权尚未完成，请重新允许通知权限。",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        (await registration.pushManager.getSubscription()) as PushSubscriptionLike | null;
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

      const subscription =
        existingSubscription ??
        ((await registration.pushManager.subscribe(
          vapidPublicKey
            ? {
                userVisibleOnly: true,
                applicationServerKey: toApplicationServerKey(vapidPublicKey),
              }
            : {
                userVisibleOnly: true,
              },
        )) as PushSubscriptionLike);

      const normalizedSubscription = normalizeSubscription(subscription.toJSON());

      await savePushSubscription({
        ...normalizedSubscription,
        deviceLabel: deriveDeviceLabel(),
      });

      setStatus("enabled");
    } catch {
      setStatus("error");
      setErrorMessage("当前设备通知开启失败，请稍后重试。");
    }
  }

  const badge = STATUS_BADGES[visualState];

  return (
    <section style={cardStyle}>
      <header style={headerStyle}>
        <div style={headerLeadStyle}>
          <span aria-hidden="true" style={iconChipStyle}>
            <Icon icon={Bell} size={18} />
          </span>
          <div style={headerTextStyle}>
            <span style={eyebrowStyle}>通知</span>
            <h3 style={titleStyle}>开启设备提醒</h3>
          </div>
        </div>
        <span style={{ ...badgeBaseStyle, ...badge.style }}>{badge.label}</span>
      </header>

      <p style={bodyStyle}>
        除了在待办页查看任务外，你也可以开启设备通知，让家庭成员在离开页面后依然能收到提醒。
      </p>

      {visualState === "unsupported" ? (
        <p style={hintStyle}>
          当前浏览器暂不支持 Web Push，仍可通过待办页查看所有提醒任务。
        </p>
      ) : null}

      {visualState === "needs_install" ? (
        <p style={hintStyle}>
          如果你使用的是 iPhone Safari，请先把应用添加到主屏幕，安装后才能开启通知权限。
        </p>
      ) : null}

      {visualState === "disabled" ? (
        <div style={actionWrapStyle}>
          <Button
            disabled={status === "pending"}
            fullWidth={false}
            onClick={() => void handleEnableNotifications()}
            type="button"
            variant="secondary"
          >
            {status === "pending" ? "开启中..." : "开启通知"}
          </Button>
          <p style={supportCopyStyle}>
            仅在支持的浏览器中才会弹出授权窗口，并为当前家庭成员保存一条设备订阅记录。
          </p>
        </div>
      ) : null}

      {visualState === "enabled" ? (
        <p role="status" style={successStyle}>
          当前设备已经可以接收家庭植物提醒通知。
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" style={errorStyle}>
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

const STATUS_BADGES: Record<VisualState, { label: string; style: React.CSSProperties }> = {
  enabled: {
    label: "已开启推送",
    style: {
      color: "var(--color-surface)",
      background: "var(--color-success)",
      border: "1px solid var(--color-success)",
    },
  },
  disabled: {
    label: "未开启",
    style: {
      color: "var(--color-leaf-light)",
      background: "var(--color-mist)",
      border: "1px solid var(--color-line)",
    },
  },
  needs_install: {
    label: "待安装",
    style: {
      color: "var(--color-leaf-light)",
      background: "var(--color-mist)",
      border: "1px solid var(--color-line)",
    },
  },
  unsupported: {
    label: "不支持",
    style: {
      color: "var(--color-muted)",
      background: "var(--color-mist)",
      border: "1px solid var(--color-line)",
    },
  },
};

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "var(--space-sm)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
};

const headerLeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  minWidth: 0,
};

const iconChipStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  fontSize: "18px",
  lineHeight: 1,
};

const headerTextStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
  minWidth: 0,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-leaf-light)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1.25,
  color: "var(--color-ink)",
};

const badgeBaseStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "var(--space-xs) var(--space-sm)",
  borderRadius: "var(--radius-pill)",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
};

const actionWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const supportCopyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.55,
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.6,
};

const successStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-success)",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.6,
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-error)",
  fontSize: "14px",
  lineHeight: 1.6,
};
