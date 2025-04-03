import type { Metadata, ResolvingMetadata } from "next";
import Default from "./page";
import { type PageWithPath } from "@/types/page";

export async function generateMetadata(
  { params }: PageWithPath,
  parent: ResolvingMetadata
): Promise<Metadata> {
  return {
    title: `Creating ${params.name}`,
  };
}

export default function PageLayout(params: PageWithPath) {
  return <Default {...params} />;
}
