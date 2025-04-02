import { Metadata } from "next";
import Page from "./page"; // import your Demo's page

export const metadata: Metadata = {
  title: "Settings",
};
export default function PageLayout() {
  return <Page />;
}
