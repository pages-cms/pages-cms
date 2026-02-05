"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/config-context";
import { getSchemaByName } from "@/lib/schema";
import {
  transformImagePaths,
  PreviewToolbar,
  PreviewFrame,
  IFrameWrapper,
  ExpandedPreviewModal,
  CollapsiblePreviewSection,
} from "./preview/shared";

interface CollectionDependency {
  name: string;
  limit?: number | string;
}

interface BlockPreviewProps {
  blockType: string;
  blockData: Record<string, unknown>;
  previewBaseUrl: string;
  currentIndex?: number;
  totalBlocks?: number;
  onIndexChange?: (index: number) => void;
  onBlockSelect?: (index: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Transform collection API response to format expected by preview blocks
function transformCollectionData(
  collectionName: string,
  apiData: {
    contents: Array<{
      name: string;
      path: string;
      fields: Record<string, unknown>;
    }>;
  },
): Array<{ slug: string; data: Record<string, unknown> }> {
  return apiData.contents
    .filter((item) => item.fields) // Only include items with parsed fields
    .map((item) => ({
      slug: item.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      data: item.fields,
    }));
}

export function BlockPreview({
  blockType,
  blockData,
  previewBaseUrl,
  currentIndex = 0,
  totalBlocks = 1,
  onIndexChange,
  onBlockSelect,
  isCollapsed,
  onToggleCollapse,
}: BlockPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [key, setKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [collectionData, setCollectionData] = useState<
    Record<string, unknown[]>
  >({});
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const { config } = useConfig();

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize block type: convert underscores to hyphens
  const normalizedBlockType = blockType.replace(/_/g, "-");

  // Get the block's component definition from config to find collection dependencies
  const blockCollections = useMemo((): CollectionDependency[] => {
    if (!config?.object?.components) return [];

    // Find the component definition for this block type
    // Block types like "sermon-grid" map to components like "sermonGridBlock"
    const componentName =
      normalizedBlockType
        .split("-")
        .map((part, i) =>
          i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("") + "Block";

    const componentDef = config.object.components[componentName];
    return componentDef?.collections || [];
  }, [config, normalizedBlockType]);

  // Fetch collection data when block has collection dependencies
  const fetchCollections = useCallback(async () => {
    if (!config || blockCollections.length === 0) return;

    setCollectionsLoading(true);
    const newCollectionData: Record<string, unknown[]> = {};

    try {
      await Promise.all(
        blockCollections.map(async (dep) => {
          try {
            const collectionSchema = getSchemaByName(config.object, dep.name);
            const collectionPath = collectionSchema?.path || "";
            const response = await fetch(
              `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${dep.name}?path=${encodeURIComponent(collectionPath)}`,
            );
            if (!response.ok) return;

            const data = await response.json();
            if (data.status === "success" && data.data?.contents) {
              let items = transformCollectionData(dep.name, data.data);

              // Transform image paths in collection items
              items = items.map((item) => ({
                ...item,
                data: transformImagePaths(item.data as Record<string, unknown>),
              }));

              // Apply limit if specified
              if (dep.limit) {
                const limitValue =
                  typeof dep.limit === "string"
                    ? (blockData[dep.limit] as number) || 10
                    : dep.limit;
                items = items.slice(0, limitValue);
              }

              newCollectionData[dep.name] = items;
            }
          } catch (err) {
            console.warn(`Failed to fetch collection "${dep.name}":`, err);
          }
        }),
      );

      setCollectionData(newCollectionData);
    } finally {
      setCollectionsLoading(false);
    }
  }, [config, blockCollections, blockData]);

  // Fetch collections when preview opens or block type changes
  useEffect(() => {
    if (hasEverOpened && blockCollections.length > 0) {
      fetchCollections();
    }
  }, [hasEverOpened, fetchCollections, blockCollections.length]);

  // Transform data for sending to preview
  // Serialize on every render to detect mutations (react-hook-form mutates in place)
  // Do NOT memoize this - we need fresh serialization each render
  const blockDataKey = JSON.stringify(blockData);
  const transformedData = useMemo(
    () => transformImagePaths(blockData),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blockDataKey is the serialized blockData, intentionally used to detect object mutations
    [blockDataKey],
  );

  // Store initial data for iframe URL (stable - doesn't change on edits)
  // This prevents iframe reloading on every keystroke
  const initialDataRef = useRef(transformedData);
  const initialDataParam = useMemo(
    () => encodeURIComponent(JSON.stringify(initialDataRef.current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key triggers recomputation on manual refresh; ref.current is intentionally not tracked
    [key],
  );

  // Base preview URL (without data for open in new tab with current data)
  const basePreviewUrl = `${previewBaseUrl}/preview/${normalizedBlockType}`;
  // Iframe URL with initial data (stable)
  const iframeUrl = `${basePreviewUrl}?data=${initialDataParam}`;

  // Send data to iframe for live updates via postMessage
  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_PREVIEW",
          blockData: transformedData,
          collections: collectionData,
        },
        "*",
      );
    }
  }, [transformedData, collectionData, isLoaded]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoaded(true);
    // Small delay ensures PreviewWrapper's useEffect has registered the listener
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "UPDATE_PREVIEW",
            blockData: transformedData,
            collections: collectionData,
          },
          "*",
        );
      }
    }, 300);
  };

  // Reload iframe with fresh data
  const handleReload = () => {
    initialDataRef.current = transformedData;
    setIsLoaded(false);
    setKey((k) => k + 1);
    // Re-fetch collections on reload
    if (blockCollections.length > 0) {
      fetchCollections();
    }
  };

  // Open preview in new tab with current data
  const handleOpenNewTab = () => {
    const currentDataParam = encodeURIComponent(
      JSON.stringify(transformedData),
    );
    window.open(`${basePreviewUrl}?data=${currentDataParam}`, "_blank");
  };

  // Navigate to previous block
  const handlePrevBlock = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      onIndexChange?.(newIndex);
      onBlockSelect?.(newIndex);
    }
  };

  // Navigate to next block
  const handleNextBlock = () => {
    if (currentIndex < totalBlocks - 1) {
      const newIndex = currentIndex + 1;
      onIndexChange?.(newIndex);
      onBlockSelect?.(newIndex);
    }
  };

  // Handle collapse/expand toggle
  const handleToggleCollapse = () => {
    const willOpen = isCollapsed;
    onToggleCollapse();
    if (willOpen && !hasEverOpened) {
      setHasEverOpened(true);
      // Update initial data when first opening
      initialDataRef.current = transformedData;
      setKey((k) => k + 1);
    }
  };

  // Header with block type and navigation
  const headerControls = (
    <div className="flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {normalizedBlockType} preview
        </span>
        {totalBlocks > 1 && (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handlePrevBlock}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1 min-w-[3rem] text-center">
              {currentIndex + 1} / {totalBlocks}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleNextBlock}
              disabled={currentIndex === totalBlocks - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <PreviewToolbar
        onReload={handleReload}
        onOpenNewTab={handleOpenNewTab}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
        isLoaded={isLoaded}
      />
    </div>
  );

  // The iframe content - only render if hasEverOpened
  const iframeContent = hasEverOpened ? (
    <IFrameWrapper
      url={iframeUrl}
      title={`${normalizedBlockType} preview`}
      onLoad={handleLoad}
      isLoaded={isLoaded}
      iframeRef={iframeRef}
      refreshKey={key}
    />
  ) : null;

  // Expanded view rendered in a portal for proper z-index - DESKTOP SIZE
  if (isExpanded && mounted && hasEverOpened) {
    return (
      <>
        {/* Placeholder to maintain layout */}
        <div className="h-[500px] bg-muted rounded-lg" />
        <ExpandedPreviewModal
          headerContent={headerControls}
          iframeContent={iframeContent}
          onClose={() => setIsExpanded(false)}
        />
      </>
    );
  }

  // Normal view with collapsible header
  return (
    <CollapsiblePreviewSection
      title="Block Preview"
      isCollapsed={isCollapsed}
      onToggle={handleToggleCollapse}
    >
      {headerControls}
      <PreviewFrame>{iframeContent}</PreviewFrame>
    </CollapsiblePreviewSection>
  );
}
