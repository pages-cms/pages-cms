"use client";

import { EntryEditor } from "@/components/entry/entry-editor";

export default function Page({
  params
}: {
  params: {
    owner: string;
    repo: string;
    branch: string;
    name: string;
    path: string;
  }
}) {
  return (
    <EntryEditor name={decodeURIComponent(params.name)} title="Create a new entry"/>
  );
}