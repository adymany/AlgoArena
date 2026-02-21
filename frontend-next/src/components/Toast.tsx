"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastOptions {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

let showToastFn: ((opts: ToastOptions) => void) | null = null;

export function showToast(message: string, type: "success" | "error" | "info" = "success", duration = 3000) {
  showToastFn?.({ message, type, duration });
}

export default function Toast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");

  const show = useCallback((opts: ToastOptions) => {
    setMessage(opts.message);
    setType(opts.type || "success");
    setVisible(true);
    setTimeout(() => setVisible(false), opts.duration || 3000);
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  const dotColor =
    type === "success" ? "var(--success)" :
    type === "error"   ? "var(--error)"   :
                         "var(--info)";

  return (
    <div className={`toast-container${visible ? " show" : ""}`}>
      <div className="toast">
        <span className="toast-dot" style={{ background: dotColor }} />
        {message}
      </div>
    </div>
  );
}
