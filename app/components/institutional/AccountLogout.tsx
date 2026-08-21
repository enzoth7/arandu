"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AccountLogout() {
  const router = useRouter();
  return <button type="button" className="reportBack" onClick={async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/iniciar-sesion"); router.refresh();
  }}><LogOut size={17} />Cerrar sesión</button>;
}
