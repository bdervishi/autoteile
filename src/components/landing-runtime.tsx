"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";
type Runtime = { destroy: () => void; read: () => void };
export function LandingRuntime() {
  const instance = useRef<Runtime | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.querySelector(".landing-page");
      if (!root) return;
      root.querySelectorAll<HTMLElement>(".sc-act--pinned").forEach((act) => {
        const stage = act.querySelector<HTMLElement>(".sc-stage");
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= innerHeight) {
          delete act.dataset.scVerifyState;
          return;
        }
        const rail = act.querySelector<HTMLElement>("[data-sc-pan]");
        const progress = getComputedStyle(act)
          .getPropertyValue("--sc-p")
          .trim();
        act.dataset.scVerifyState = `${progress}|${rect.top.toFixed(1)}|${rail ? getComputedStyle(rail).transform : ""}`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    const focus = (event: FocusEvent) => {
      const el = event.target as HTMLElement;
      const rail = el.closest<HTMLElement>(".offer-rail");
      const act = rail?.closest<HTMLElement>("[data-sc-act]");
      if (
        rail &&
        act &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const stages = act.getBoundingClientRect();
        const progress = Math.max(
          0,
          Math.min(
            1,
            (el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2) /
              Math.max(1, rail.scrollWidth - innerWidth),
          ),
        );
        window.scrollTo({
          top: scrollY + stages.top + (stages.height - innerHeight) * progress,
          behavior: "instant",
        });
      }
      const canton = el.closest<HTMLElement>(".canton-section");
      if (canton && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const b = canton.getBoundingClientRect();
        window.scrollTo({
          top: scrollY + b.top + (b.height - innerHeight) * 0.72,
          behavior: "instant",
        });
      }
    };
    document.addEventListener("focusin", focus);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", focus);
      cancelAnimationFrame(frame);
      instance.current?.destroy();
      instance.current = null;
    };
  }, []);
  return (
    <Script
      src="/landing/scrollcraft.js"
      strategy="afterInteractive"
      onReady={() => {
        const root = document.querySelector<HTMLElement>(".landing-page");
        const runtime = (
          window as unknown as {
            ScrollCraft?: { mount: (root: HTMLElement) => Runtime };
          }
        ).ScrollCraft;
        if (root && runtime && !instance.current)
          instance.current = runtime.mount(root);
      }}
    />
  );
}
