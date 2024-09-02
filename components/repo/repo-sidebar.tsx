"use client";

import { User } from "@/components/user";
import { RepoDropdown } from "@/components/repo/repo-dropdown";
import { RepoNav } from "@/components/repo/repo-nav";
import { About } from "@/components/about";

const RepoSidebar = ({
  onClick
}: {
  onClick?: () => void
}) => (
  <>
    <header className="px-3 pt-3">
      <RepoDropdown onClick={onClick} />
    </header>
    <nav className="px-3 flex flex-col gap-y-1 overflow-auto">
      <RepoNav onClick={onClick}/>
    </nav>
    <footer className="flex items-center gap-2 border-t px-3 py-2 mt-auto">
      <User className="mr-auto" onClick={onClick}/>
      <About onClick={onClick}/>
    </footer>
  </>
);

export { RepoSidebar };