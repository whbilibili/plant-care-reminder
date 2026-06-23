import { useEffect } from "react";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // 如果页面已经加载完毕，直接注册；否则等 load 事件
  if (document.readyState === "complete") {
    void navigator.serviceWorker.register("/sw.js");
  } else {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/sw.js");
    });
  }
}

export function PwaRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
