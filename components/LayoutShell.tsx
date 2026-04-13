"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SidebarProvider } from "@/lib/SidebarContext";
import { AuthProvider } from "@/lib/AuthContext";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  // Login page (and landing page) render their own full-screen layout
  if (pathname === "/login" || pathname === "/") {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <SidebarProvider value={{ isOpen }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <Header sidebarOpen={isOpen} />
            <main style={{ flex: 1, marginTop: 64, overflowY: "auto", height: "calc(100vh - 64px)" }}>
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}

