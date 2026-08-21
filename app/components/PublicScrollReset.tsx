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

    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const resetHomeScroll = () => {
      if (window.location.pathname !== "/") return;
      if (window.location.hash === "#registro") {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
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
