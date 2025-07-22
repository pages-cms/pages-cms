import type { Metadata, ResolvingMetadata } from "next";
import Default from "./page";
import { getFileName } from "@/lib/utils/file";
import { type PageWithPath } from "@/types/page";

export async function generateMetadata(
  { params }: PageWithPath,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const filename = getFileName(decodeURIComponent(params.path));
  return {
    title: `Editing "${filename}" | ${params.name}`,
  };
}

export default function PageLayout(params: PageWithPath) {
  return <Default {...params} />;
}
