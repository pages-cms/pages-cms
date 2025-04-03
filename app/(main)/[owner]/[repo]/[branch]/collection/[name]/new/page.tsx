"use client";

import { useSearchParams } from "next/navigation";
import { EntryEditor } from "@/components/entry/entry-editor";
import { PageWithPath } from "@/types/page";

export default function Page({ params }: PageWithPath) {
  const searchParams = useSearchParams();
  const parent = searchParams.get("parent") || undefined;

  return (
    <EntryEditor name={decodeURIComponent(params.name)} title="Create a new entry" parent={parent}/>
  );
}