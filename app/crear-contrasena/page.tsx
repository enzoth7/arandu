import type { Metadata } from "next";
import { AccountAccess } from "../components/AccountAccess";


export const metadata: Metadata = { title: "Crear contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CreatePasswordPage() {
  return <AccountAccess mode="password" />;
}

