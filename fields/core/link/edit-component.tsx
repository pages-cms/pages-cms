"use client";

import { forwardRef, useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useConfig } from "@/contexts/config-context";

interface ManifestLink {
  url: string;
  title: string;
}

interface SiteManifest {
  generated: string;
  collections: Record<string, ManifestLink[]>;
}

let manifestCache: { url: string; data: SiteManifest | null; loading: boolean } = {
  url: "",
  data: null,
  loading: false,
};
let manifestPromise: Promise<SiteManifest | null> | null = null;

const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const { value, onChange, field } = props;
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState<SiteManifest | null>(manifestCache.data);
  const [loading, setLoading] = useState(false);

  const previewUrl = config?.object?.previewUrl;
  const manifestUrl = previewUrl ? `${previewUrl}/site-manifest.json` : null;

  useEffect(() => {
    if (!manifestUrl) return;

    if (manifestCache.url === manifestUrl && manifestCache.data) {
      setManifest(manifestCache.data);
      return;
    }

    if (manifestCache.url === manifestUrl && manifestPromise) {
      setLoading(true);
      manifestPromise.then((data) => {
        setManifest(data);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    manifestCache = { url: manifestUrl, data: null, loading: true };

    manifestPromise = fetch(manifestUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch manifest");
        return res.json();
      })
      .then((data: SiteManifest) => {
        manifestCache = { url: manifestUrl, data, loading: false };
        setManifest(data);
        setLoading(false);
        return data;
      })
      .catch((err) => {
        console.warn("Could not load site manifest:", err);
        manifestCache = { url: manifestUrl, data: null, loading: false };
        setLoading(false);
        return null;
      });
  }, [manifestUrl]);

  const isExternal = useMemo(() => {
    if (!value) return false;
    return value.startsWith("http://") || value.startsWith("https://");
  }, [value]);

  const selectedTitle = useMemo(() => {
    if (!value || !manifest || isExternal) return null;
    for (const links of Object.values(manifest.collections)) {
      const found = links.find((link) => link.url === value);
      if (found) return found.title;
    }
    return null;
  }, [value, manifest, isExternal]);

  const handleSelect = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const formatCollectionName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="flex gap-1">
      <div className="relative flex-1">
        <Input
          ref={ref}
          value={value || ""}
          onChange={handleInputChange}
          placeholder={field.options?.placeholder || "Select or enter URL..."}
          className="text-base pr-8"
        />
        {isExternal && (
          <ExternalLink className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        {!isExternal && selectedTitle && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground truncate max-w-[120px]">
            {selectedTitle}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={!manifestUrl}
            aria-label="Browse internal pages"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search pages..." />
            <CommandList>
              <CommandEmpty>No pages found.</CommandEmpty>
              {manifest &&
                Object.entries(manifest.collections).map(([collection, links]) => (
                  <CommandGroup key={collection} heading={formatCollectionName(collection)}>
                    {links.map((link) => (
                      <CommandItem
                        key={link.url}
                        value={`${link.title} ${link.url}`}
                        onSelect={() => handleSelect(link.url)}
                      >
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{link.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {link.url}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              <CommandGroup heading="External">
                <CommandItem
                  value="external-url-option"
                  onSelect={() => {
                    onChange("https://");
                    setOpen(false);
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Enter external URL...</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

EditComponent.displayName = "LinkEditComponent";

export { EditComponent };
