"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntryEditor } from "@/components/entry/entry-editor";

export default function Page() {
  const searchParams = useSearchParams();
  const parent = searchParams.get("parent") || undefined;
  const params = useParams<{ name?: string }>();
  const name = decodeURIComponent(params.name || "");

  return (
    <EntryEditor name={name} title="Create a new entry" parent={parent}/>
  );
}
