// frontend/components/KeepAlive.tsx
"use client";
import { useKeepAlive } from "@/lib/hooks/use-keep-alive";

export function KeepAlive() {
  useKeepAlive();
  return null;
}
