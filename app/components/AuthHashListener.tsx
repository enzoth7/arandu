"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabase/browser";

export function AuthHashListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const searchCode = searchParams.get("code");
    const searchTokenHash = searchParams.get("token_hash");
    if ((searchCode || searchTokenHash) && pathname !== "/auth/callback") {
      const cb = new URL("/auth/callback", window.location.origin);
      if (searchCode) cb.searchParams.set("code", searchCode);
      if (searchTokenHash) cb.searchParams.set("token_hash", searchTokenHash);
      const searchType = searchParams.get("type");
      if (searchType) cb.searchParams.set("type", searchType);
      cb.searchParams.set("next", "/crear-contrasena");
      cb.searchParams.set("kind", "signup");
      window.location.replace(cb.toString());
      return;
    }

    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;


    try {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");
      const errorCode = params.get("error_code");

      if (errorCode) {
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (accessToken && refreshToken) {
        const supabase = createBrowserSupabaseClient();
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (!error) {
              window.history.replaceState(null, "", window.location.pathname);

              if (type === "recovery") {
                window.location.replace("/restablecer-contrasena");
              } else if (type === "signup" || type === "invite" || type === "magiclink" || type === "email_change") {
                if (pathname === "/" || pathname === "/iniciar-sesion" || pathname === "/registrarse" || pathname === "/auth/callback") {
                  window.location.replace("/crear-contrasena");
                } else {
                  router.refresh();
                }
              } else {
                if (pathname === "/" || pathname === "/iniciar-sesion" || pathname === "/registrarse") {
                  window.location.replace("/cuenta");
                } else {
                  router.refresh();
                }
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      // Ignore hash parsing errors
    }
  }, [pathname, router]);

  return null;
}
