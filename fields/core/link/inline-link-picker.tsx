"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import {
  useSiteManifest,
  formatCollectionName,
  isExternalUrl,
} from "./use-site-manifest";

interface InlineLinkPickerProps {
  value: string;
  onChange: (url: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function InlineLinkPicker({
  value,
  onChange,
  onApply,
  onRemove,
}: InlineLinkPickerProps) {
  const { manifest, loading, manifestUrl } = useSiteManifest();
  const [showDropdown, setShowDropdown] = useState(false);

  const isExternal = useMemo(() => isExternalUrl(value), [value]);

  const handleSelect = (url: string) => {
    onChange(url);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onApply();
    }
  };

  if (showDropdown && manifest) {
    return (
      <div className="w-64">
        <Command className="border-0">
          <CommandInput
            placeholder="Search pages..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
          />
          <CommandList className="max-h-48">
            <CommandEmpty>No pages found.</CommandEmpty>
            {Object.entries(manifest.collections).map(([collection, links]) => (
              <CommandGroup key={collection} heading={formatCollectionName(collection)}>
                {links.map((link) => (
                  <CommandItem
                    key={link.url}
                    value={`${link.title} ${link.url}`}
                    onSelect={() => handleSelect(link.url)}
                  >
                    <FileText className="mr-2 h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs">{link.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandGroup heading="External">
              <CommandItem
                value="external-url-option"
                onSelect={() => {
                  onChange("https://");
                  setShowDropdown(false);
                }}
              >
                <ExternalLink className="mr-2 h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Enter external URL...</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="w-full text-xs"
            onClick={() => setShowDropdown(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-x-1 items-center">
      <div className="relative flex-1">
        <Input
          className="h-8 pr-7 text-sm"
          placeholder="Enter URL or browse..."
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {manifestUrl && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-8 w-7"
            onClick={() => setShowDropdown(true)}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xxs"
        className="shrink-0"
        onClick={onApply}
      >
        Link
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xxs"
        className="shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
