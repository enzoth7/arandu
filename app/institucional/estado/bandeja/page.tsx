import type { Metadata } from "next";
import { StateInbox } from "../../../components/institutional/StateInbox";
export const metadata: Metadata = { title: "Bandeja estatal demo", robots: { index: false, follow: false } };
export default function StateInboxPage() { return <StateInbox />; }
