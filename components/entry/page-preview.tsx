'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  transformImagePaths,
  PreviewToolbar,
  IFrameWrapper,
  ExpandedPreviewModal,
  CollapsiblePreviewSection,
} from './preview/shared';

interface PagePreviewProps {
  blocks: Array<Record<string, unknown>>;
  blockKey: string;
  previewBaseUrl: string;
}

export function PagePreview({
  blocks,
  blockKey,
  previewBaseUrl,
}: PagePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Start collapsed - lazy load on first expand
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [key, setKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Transform data for sending to preview
  // Serialize on every render to detect mutations (react-hook-form mutates in place)
  const blocksKey = JSON.stringify(blocks);
  const transformedBlocks = useMemo(
    () => blocks.map(block => transformImagePaths(block)),
    [blocksKey]
  );

  // Store initial data for iframe URL (stable - doesn't change on edits)
  const initialDataRef = useRef({ blocks: transformedBlocks, blockKey });
  const initialDataParam = useMemo(
    () => encodeURIComponent(JSON.stringify(initialDataRef.current)),
    [key]
  );

  // Preview URLs
  const basePreviewUrl = `${previewBaseUrl}/preview/page`;
  const iframeUrl = `${basePreviewUrl}?data=${initialDataParam}`;

  // Send data to iframe for live updates via postMessage
  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_PAGE_PREVIEW', blocks: transformedBlocks, blockKey },
        '*'
      );
    }
  }, [transformedBlocks, blockKey, isLoaded]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoaded(true);
    // Small delay ensures PreviewPageWrapper's useEffect has registered the listener
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'UPDATE_PAGE_PREVIEW', blocks: transformedBlocks, blockKey },
          '*'
        );
      }
    }, 150);
  };

  // Reload iframe with fresh data
  const handleReload = () => {
    initialDataRef.current = { blocks: transformedBlocks, blockKey };
    setIsLoaded(false);
    setKey((k) => k + 1);
  };

  // Open preview in new tab with current data
  const handleOpenNewTab = () => {
    const currentDataParam = encodeURIComponent(
      JSON.stringify({ blocks: transformedBlocks, blockKey })
    );
    window.open(`${basePreviewUrl}?data=${currentDataParam}`, '_blank');
  };

  // Handle collapse/expand toggle
  const handleToggleCollapse = () => {
    const willOpen = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (willOpen && !hasEverOpened) {
      setHasEverOpened(true);
      // Update initial data when first opening
      initialDataRef.current = { blocks: transformedBlocks, blockKey };
      setKey((k) => k + 1);
    }
  };

  const blockCount = blocks.length;

  // Header with page info
  const headerControls = (
    <div className="flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b">
      <span className="text-sm font-medium text-muted-foreground">
        Page Preview ({blockCount} {blockCount === 1 ? 'block' : 'blocks'})
      </span>
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
      title="Full page preview"
      onLoad={handleLoad}
      isLoaded={isLoaded}
      iframeRef={iframeRef}
      refreshKey={key}
    />
  ) : null;

  // Expanded view rendered in a portal for proper z-index
  if (isExpanded && mounted && hasEverOpened) {
    return (
      <>
        {/* Placeholder to maintain layout */}
        <div className="h-[300px] bg-muted rounded-lg" />
        <ExpandedPreviewModal
          headerContent={headerControls}
          iframeContent={iframeContent}
          onClose={() => setIsExpanded(false)}
        />
      </>
    );
  }

  // Normal view - no iPhone frame, just a simple preview area
  return (
    <CollapsiblePreviewSection
      title="Page Preview"
      isCollapsed={isCollapsed}
      onToggle={handleToggleCollapse}
    >
      {headerControls}
      <div className="border rounded-lg overflow-hidden mt-2 h-[400px]">
        {iframeContent}
      </div>
    </CollapsiblePreviewSection>
  );
}
