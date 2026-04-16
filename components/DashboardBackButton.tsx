import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export default function DashboardBackButton() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm text-gray-700 hover:bg-gray-50 transition"
    >
      <ArrowLeft size={16} weight="bold" />
      Dashboard
    </Link>
  );
}
