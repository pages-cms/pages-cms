"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { getSchemaByName } from "@/lib/schema";
import { EntryEditor } from "@/components/entry/entry-editor";

export default function Page() {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const params = useParams<{ name?: string; path?: string | string[] }>();
  const name = decodeURIComponent(params.name || "");
  const path = Array.isArray(params.path)
    ? params.path.map(segment => decodeURIComponent(segment)).join("/")
    : decodeURIComponent(params.path || "");

  const schema = useMemo(() => getSchemaByName(config.object, name), [config, name]);
  if (!schema) throw new Error(`Schema not found for ${name}.`);
  
  return (
    <EntryEditor name={name} path={path}/>
  );
}
