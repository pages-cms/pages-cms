import type { Metadata, ResolvingMetadata } from "next";
import Default from "./page";
import { type Page } from "@/types/page";

export async function generateMetadata(
  { params }: Page,
  parent: ResolvingMetadata
): Promise<Metadata> {
  return {
    title: params.name,
  };
}

export default function PageLayout(params: Page) {
  return <Default {...params} />;
}
