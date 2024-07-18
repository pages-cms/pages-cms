"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { cn } from "@/lib/utils";
import { FileStack, FileText, Image as ImageIcon, Settings } from "lucide-react";

const RepoNavItem = ({
  children,
  href,
  type,
  active,
  onClick
}: {
  children: React.ReactNode;
  href: string;
  type: string;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    className={cn(
      active ? "bg-accent" : "hover:bg-accent",
      "flex items-center rounded-lg px-3 py-2 font-medium focus:bg-accent outline-none"
    )}
    href={href}
    onClick={onClick}
  >
    {type === "collection" && <FileStack className="h-5 w-5 mr-2" />}
    {type === "file" && <FileText className="h-5 w-5 mr-2" />}
    {type === "media" && <ImageIcon className="h-5 w-5 mr-2" />}
    {type === "settings" && <Settings className="h-5 w-5 mr-2" />}
    <span className="truncate">{children}</span>
  </Link>
);

const RepoNav = ({
  onClick
}: {
  onClick?: () => void;
}) => {
  const { config } = useConfig();
  const pathname = usePathname();

  const items = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    const contentItems = configObject.content?.map((item: any) => ({
      key: item.name,
      type: item.type,
      href: `/${config.owner}/${config.repo}/${config.branch}/${item.type}/${encodeURIComponent(item.name)}`,
      label: item.label || item.name,
    })) || [];

    const mediaItem = configObject.media?.input && configObject.media?.output
      ? {
          key: 'media',
          type: 'media',
          href: `/${config.owner}/${config.repo}/${config.branch}/media`,
          label: 'Media'
        }
      : null;

    const settingsItem = configObject.settings !== false
      ? {
          key: 'settings',
          type: 'settings',
          href: `/${config.owner}/${config.repo}/${config.branch}/settings`,
          label: 'Settings'
        }
      : null;

    return [...contentItems, mediaItem, settingsItem].filter(Boolean);
  }, [config]);

  if (!items.length) return null;

  return (
    <>
      {items.map(item => (
        <RepoNavItem
          key={item.key}
          type={item.type}
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