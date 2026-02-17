"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      router.replace("/problems");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
        color: "var(--text-secondary)",
      }}
    >
      Loading...
    </div>
  );
}
