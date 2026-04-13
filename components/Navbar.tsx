"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  void pathname; // kept to preserve import interface

  // Landing page has its own premium navbar, inner pages use Sidebar.
  // This component is no longer needed.
  return null;
}
