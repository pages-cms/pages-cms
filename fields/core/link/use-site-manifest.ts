"use client";

import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/config-context";

export interface ManifestLink {
  url: string;
  title: string;
}

export interface SiteManifest {
  generated: string;
  collections: Record<string, ManifestLink[]>;
}

// Module-level cache shared across all hook instances
let manifestCache: { url: string; data: SiteManifest | null } = {
  url: "",
  data: null,
};
let manifestPromise: Promise<SiteManifest | null> | null = null;

export function useSiteManifest() {
  const { config } = useConfig();
  const [manifest, setManifest] = useState<SiteManifest | null>(manifestCache.data);
  const [loading, setLoading] = useState(false);

  const previewUrl = config?.object?.previewUrl;
  const manifestUrl = previewUrl ? `${previewUrl}/site-manifest.json` : null;

  useEffect(() => {
    if (!manifestUrl) return;

    // Return cached data if same URL
    if (manifestCache.url === manifestUrl && manifestCache.data) {
      setManifest(manifestCache.data);
      return;
    }

    // If already loading, wait for the promise
    if (manifestCache.url === manifestUrl && manifestPromise) {
      setLoading(true);
      manifestPromise.then((data) => {
        setManifest(data);
        setLoading(false);
      });
      return;
    }

    // Start new fetch
    setLoading(true);
    manifestCache = { url: manifestUrl, data: null };

    manifestPromise = fetch(manifestUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch manifest");
        return res.json();
      })
      .then((data: SiteManifest) => {
        manifestCache = { url: manifestUrl, data };
        setManifest(data);
        setLoading(false);
        return data;
      })
      .catch((err) => {
        console.warn("Could not load site manifest:", err);
        manifestCache = { url: manifestUrl, data: null };
        setLoading(false);
        return null;
      });
  }, [manifestUrl]);

  return { manifest, loading, manifestUrl };
}

export function formatCollectionName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function findLinkTitle(manifest: SiteManifest | null, url: string): string | null {
  if (!manifest || !url) return null;
  for (const links of Object.values(manifest.collections)) {
    const found = links.find((link) => link.url === url);
    if (found) return found.title;
  }
  return null;
}

export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}
