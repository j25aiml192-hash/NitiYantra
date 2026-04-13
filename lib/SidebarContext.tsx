"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  isOpen: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({ isOpen: true });

export const SidebarProvider = SidebarContext.Provider;

export function useSidebar() {
  return useContext(SidebarContext);
}
