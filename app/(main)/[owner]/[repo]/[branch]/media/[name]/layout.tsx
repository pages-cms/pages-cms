import type { Metadata } from "next";
import Default from "./page";
import { type PageNameOnly } from "@/types/page";

export const metadata: Metadata = {
  title: "Media",
}

export default function PageLayout(params: PageNameOnly) {
  return <Default {...params} />;
}
