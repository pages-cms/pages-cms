"use client";

import { useEffect, useState } from "react";
import { RepoSidebar } from "@/components/repo/repo-sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { trackVisit } from "@/lib/tracker";
import { SidebarTrigger } from "../ui/sidebar";

export function RepoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const { config } = useConfig();
  const { owner, repo } = useRepo();

  const handleMenuClose = () => setMenuOpen(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    if (isMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (config?.owner && config?.repo && config?.branch) {
      trackVisit(owner, repo, config.branch);
    }
  }, [config]);

  return (
    <>
      <div className="flex h-screen w-full">
        <aside>
          <RepoSidebar />
        </aside>
        <main className="flex flex-col flex-1 relative h-screen overflow-hidden">
          <div className="h-14 xl:h-0"></div>
          <div className="flex-1 overflow-auto scrollbar p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <div className="xl:hidden">
        <div className="fixed top-0 left-0 right-0 bg-background border-b h-14 flex items-center px-4 md:px-6">
          <SidebarTrigger />
        </div>
        <aside>
          <RepoSidebar onClick={handleMenuClose} />
        </aside>
      </div>
    </>
  );
}