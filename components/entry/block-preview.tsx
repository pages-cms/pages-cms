'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  transformImagePaths,
  PreviewToolbar,
  PreviewFrame,
  IFrameWrapper,
  ExpandedPreviewModal,
  CollapsiblePreviewSection,
} from './preview/shared';

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

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize block type: convert underscores to hyphens
  const normalizedBlockType = blockType.replace(/_/g, '-');

  // Transform data for sending to preview
  // Serialize on every render to detect mutations (react-hook-form mutates in place)
  // Do NOT memoize this - we need fresh serialization each render
  const blockDataKey = JSON.stringify(blockData);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- blockDataKey is the serialized blockData, intentionally used to detect object mutations
  const transformedData = useMemo(() => transformImagePaths(blockData), [blockDataKey]);

  // Store initial data for iframe URL (stable - doesn't change on edits)
  // This prevents iframe reloading on every keystroke
  const initialDataRef = useRef(transformedData);
  const initialDataParam = useMemo(
    () => encodeURIComponent(JSON.stringify(initialDataRef.current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key triggers recomputation on manual refresh; ref.current is intentionally not tracked
    [key]
  );

  // Base preview URL (without data for open in new tab with current data)
  const basePreviewUrl = `${previewBaseUrl}/preview/${normalizedBlockType}`;
  // Iframe URL with initial data (stable)
  const iframeUrl = `${basePreviewUrl}?data=${initialDataParam}`;

  // Send data to iframe for live updates via postMessage
  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_PREVIEW', blockData: transformedData },
        '*'
      );
    }
  }, [transformedData, isLoaded]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoaded(true);
    // Small delay ensures PreviewWrapper's useEffect has registered the listener
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'UPDATE_PREVIEW', blockData: transformedData },
          '*'
        );
      }
    }, 150);
  };

  // Reload iframe with fresh data
  const handleReload = () => {
    initialDataRef.current = transformedData;
    setIsLoaded(false);
    setKey((k) => k + 1);
  };

  // Open preview in new tab with current data
  const handleOpenNewTab = () => {
    const currentDataParam = encodeURIComponent(JSON.stringify(transformedData));
    window.open(`${basePreviewUrl}?data=${currentDataParam}`, '_blank');
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
      <PreviewFrame>
        {iframeContent}
      </PreviewFrame>
    </CollapsiblePreviewSection>
  );
}
