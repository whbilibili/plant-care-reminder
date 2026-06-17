import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { Button } from "../components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_BANNER_DISMISSED_KEY = "plant-care-install-dismissed";

function isStandaloneDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIosSafariInstallCandidate() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
  const isWebkitBrowser = /safari/.test(userAgent) && !/crios|fxios/.test(userAgent);

  return isIosDevice && isWebkitBrowser && !isStandaloneDisplayMode();
}

export function InstallPromptEntry() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return window.localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === "true";
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
      window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (dismissed || isStandaloneDisplayMode()) {
    return null;
  }

  const showIosHint = deferredPrompt === null && isIosSafariInstallCandidate();
  if (!deferredPrompt && !showIosHint) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true");
  };

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
      setDeferredPrompt(null);
    }
  };

  return (
    <aside style={bannerStyle} aria-label="Install app prompt">
      <div style={copyWrapStyle}>
        <p style={eyebrowStyle}>Install App</p>
        <p style={titleStyle}>Pin Plant Care Reminder to your home screen.</p>
        <p style={copyStyle}>
          {showIosHint
            ? "On iPhone Safari, use Share -> Add to Home Screen to enable the app-like shell and future reminders."
            : "Install the PWA to launch faster, keep the mobile shell, and prepare for notification support."}
        </p>
      </div>
      <div style={actionsStyle}>
        {!showIosHint ? (
          <Button type="button" fullWidth={false} onClick={() => void promptInstall()}>
            Install
          </Button>
        ) : null}
        <Button type="button" fullWidth={false} variant="ghost" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </aside>
  );
}

const bannerStyle: CSSProperties = {
  position: "fixed",
  left: "16px",
  right: "16px",
  bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
  zIndex: 20,
  display: "grid",
  gap: "14px",
  borderRadius: "20px",
  padding: "16px",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  backdropFilter: "blur(12px)",
};

const copyWrapStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.72rem",
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1rem",
  fontWeight: 700,
  lineHeight: 1.4,
};

const copyStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.88rem",
  lineHeight: 1.55,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};
