import type { Metadata } from "next";
import { Sources } from "../../../components/Sources";
export const metadata: Metadata = { title: "Fuentes · Estado", robots: { index: false, follow: false } };
export default function StateSourcesPage() { return <Sources />; }
