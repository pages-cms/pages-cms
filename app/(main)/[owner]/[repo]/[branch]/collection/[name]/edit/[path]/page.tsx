"use client";

import { useMemo, use } from "react";
import { useConfig } from "@/contexts/config-context";
import { getSchemaByName } from "@/lib/schema";
import { EntryEditor } from "@/components/entry/entry-editor";

export default function Page(
  props: {
    params: Promise<{
      owner: string;
      repo: string;
      branch: string;
      name: string;
      path: string;
    }>
  }
) {
  const params = use(props.params);
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const schema = useMemo(() => getSchemaByName(config.object, decodeURIComponent(params.name)), [config, params.name]);
  if (!schema) throw new Error(`Schema not found for ${decodeURIComponent(params.name)}.`);

  return (
    <EntryEditor name={decodeURIComponent(params.name)} path={decodeURIComponent(params.path)}/>
  );
}