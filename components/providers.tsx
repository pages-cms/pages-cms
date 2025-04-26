"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/contexts/user-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User } from "@/types/user";
import { NavigationBlockerProvider, BlockBrowserNavigation } from "./navigation-block";

export function Providers({ children, user }: { children: React.ReactNode, user: User | null }) {
  return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UserProvider user={user}>
          <TooltipProvider>
            <NavigationBlockerProvider>
              {children}
            </NavigationBlockerProvider>
          </TooltipProvider>
        </UserProvider>
      </ThemeProvider>
  );
}