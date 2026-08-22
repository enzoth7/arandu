import type { Metadata } from "next";
import { AccountAccess } from "../components/AccountAccess";


export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <AccountAccess mode="reset" />;
}

