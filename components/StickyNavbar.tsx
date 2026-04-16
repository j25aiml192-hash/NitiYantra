"use client";

import Link from "next/link";
import { Scales } from "@phosphor-icons/react";

export default function StickyNavbar() {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 flex items-center justify-between px-6 h-16 bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Scales size={24} weight="duotone" className="text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900">
          NitiYantra
        </span>
      </div>

      {/* Nav anchor links */}
      <nav className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition">Features</a>
        <a href="#problems" className="text-sm text-slate-600 hover:text-slate-900 transition">Problems</a>
        <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition">About</a>
      </nav>

      <Link
        href="/login"
        className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-all shadow-sm"
      >
        Login
      </Link>
    </header>
  );
}
