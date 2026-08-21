"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function PublicScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    let hashTargetRetries = 0;

    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const resetHomeScroll = () => {
      if (window.location.pathname !== "/") return;
      const hasRequestedTarget = ["#registro", "#mapa-registro"].includes(window.location.hash);
      const requestedTarget = hasRequestedTarget
        ? document.querySelector<HTMLElement>(window.location.hash)
        : null;

      if (hasRequestedTarget && !requestedTarget && hashTargetRetries < 20) {
        hashTargetRetries += 1;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(resetHomeScroll, 100);
        return;
      }

      if (requestedTarget) {
        hashTargetRetries = 0;
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
        window.clearTimeout(settleTimer);
        const scrollToTarget = () => {
          requestedTarget.scrollIntoView({ block: "start", behavior: "auto" });
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        };
        firstFrame = window.requestAnimationFrame(() => {
          scrollToTarget();
          secondFrame = window.requestAnimationFrame(scrollToTarget);
        });
        settleTimer = window.setTimeout(scrollToTarget, 250);
        return;
      }
      hashTargetRetries = 0;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      scrollToTop();
      firstFrame = window.requestAnimationFrame(() => {
        scrollToTop();
        secondFrame = window.requestAnimationFrame(scrollToTop);
      });
      settleTimer = window.setTimeout(scrollToTop, 250);
    };

    resetHomeScroll();
    window.addEventListener("pageshow", resetHomeScroll);
    window.addEventListener("popstate", resetHomeScroll);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("pageshow", resetHomeScroll);
      window.removeEventListener("popstate", resetHomeScroll);
    };
  }, [pathname]);

  return null;
}
