"use client";

import { useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { MediaView} from "@/components/media/media-view";
import { Message } from "@/components/message";

export default function Page() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || '';

  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  if (!config.object.media?.input) {
    return (
      <Message
        title="No media defined"
        description="You have no media defined in your settings."
        className="absolute inset-0"
        cta="Go to settings"
        href={`/${config.owner}/${config.repo}/${config.branch}/settings`}
      />
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto flex-1 flex flex-col">
      <header className="flex items-center mb-6">
        <h1 className="font-semibold text-lg md:text-2xl">Media</h1>
      </header>
      <div className="flex flex-col relative flex-1">
        <MediaView initialPath={path}/>
      </div>
    </div>
  );
}