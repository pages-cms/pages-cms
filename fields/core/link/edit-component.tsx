"use client";

import { forwardRef, useState, useMemo } from "react";
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
import {
  useSiteManifest,
  findLinkTitle,
  isExternalUrl,
  formatCollectionName,
} from "./use-site-manifest";

const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const { value, onChange, field } = props;
  const { manifest, loading, manifestUrl } = useSiteManifest();
  const [open, setOpen] = useState(false);

  const isExternal = useMemo(() => isExternalUrl(value), [value]);
  const selectedTitle = useMemo(
    () => (isExternal ? null : findLinkTitle(manifest, value)),
    [value, manifest, isExternal]
  );

  const handleSelect = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
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
