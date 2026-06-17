import { useEffect } from "react";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

export function PwaRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
