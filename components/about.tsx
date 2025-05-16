"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleHelp, Chrome, Book, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";

export function About({
  onClick
}: {
  onClick?: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <SidebarMenuButton className="flex items-center rounded-lg px-3 py-2 font-medium focus:bg-accent outline-hidden">
          <CircleHelp className="h-5 w-5 mr-2" />
          About Pages CMS
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About Pages CMS</DialogTitle>
          <DialogDescription>Pages CMS is an Open Source Content Management System built for static websites (Jekyll, Next.js, VuePress, Hugo, etc). It allows you to edit your website&apos;s content directly on GitHub via a user-friendly interface.</DialogDescription>
        </DialogHeader>
        <footer className="grid grid-flow-col justify-stretch text-sm gap-x-2">
          <a className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")} href="https://pagescms.org" target="_blank">
            <Chrome className="h-4 w-4 shrink-0 mr-2" />
            Website
          </a>
          <a className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")} href="https://pagescms.org/docs" target="_blank">
            <Book className="h-4 w-4 shrink-0 mr-2" />
            Docs
          </a>
          <a className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")} href="https://github.com/pages-cms/pages-cms" target="_blank">
            <Github className="h-4 w-4 shrink-0 mr-2" />
            GitHub
          </a>
        </footer>
      </DialogContent>
    </Dialog>
  )
}