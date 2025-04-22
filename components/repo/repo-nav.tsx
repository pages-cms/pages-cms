"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const RepoNavItem = ({
  children,
  href,
  icon,
  active,
  onClick
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link
        className={cn(
          active ? "bg-accent" : "hover:bg-accent",
          "flex items-center rounded-lg px-3 py-2 font-medium focus:bg-accent outline-hidden"
        )}
        href={href}
        onClick={onClick}
        prefetch={true}
      >
        {icon}
        <span className="truncate">{children}</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
);

const RepoNav = ({
  onClick,
  items
}: {
  onClick?: () => void;
  items?: {
    key: string;
    icon: React.ReactNode;
    href: string;
    label: string;
  }[];
}) => {
  const pathname = usePathname();

  if (!items.length) return null;

  return (
    <>
      {items.map(item => (
        <RepoNavItem
          key={item.key}
          icon={item.icon}
          href={item.href}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onClick={onClick}
        >
          {item.label}
        </RepoNavItem>
      ))}
    </>
  );
}

export { RepoNav };