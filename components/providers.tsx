"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/contexts/user-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User } from "@/types/user";
import { SidebarProvider } from "@/components/ui/sidebar";
export function Providers({ children, user }: { children: React.ReactNode, user: User | null }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider user={user}>
        <SidebarProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  );
}