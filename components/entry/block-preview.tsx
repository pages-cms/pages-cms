'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Loader, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Transform image paths from CMS format to preview-accessible format
const transformImagePaths = (data: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && value.startsWith('public/uploads/')) {
      result[key] = value.replace('public/uploads/', '/uploads/');
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformImagePaths(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = transformImagePaths(value as Record<string, unknown>);
    }
  }
  return result;
};

interface BlockPreviewProps {
  blockType: string;
  blockData: Record<string, unknown>;
  previewBaseUrl: string;
  currentIndex?: number;
  totalBlocks?: number;
  onIndexChange?: (index: number) => void;
}

export function BlockPreview({
  blockType,
  blockData,
  previewBaseUrl,
  currentIndex = 0,
  totalBlocks = 1,
  onIndexChange,
}: BlockPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
  const transformedData = useMemo(() => transformImagePaths(blockData), [blockDataKey]);

  // Store initial data for iframe URL (stable - doesn't change on edits)
  // This prevents iframe reloading on every keystroke
  const initialDataRef = useRef(transformedData);
  const initialDataParam = useMemo(
    () => encodeURIComponent(JSON.stringify(initialDataRef.current)),
    [key] // Only recompute when key changes (on refresh)
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
    if (onIndexChange && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  // Navigate to next block
  const handleNextBlock = () => {
    if (onIndexChange && currentIndex < totalBlocks - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  // Header controls - shared between normal and expanded views
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
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCollapsed ? 'Show' : 'Hide'} preview
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleReload}
              disabled={!isLoaded}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reload preview</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleOpenNewTab}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isExpanded ? 'Minimize' : 'Expand'} preview
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  // The iframe content
  const iframeContent = (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading preview...</span>
          </div>
        </div>
      )}
      <iframe
        key={key}
        ref={iframeRef}
        src={iframeUrl}
        onLoad={handleLoad}
        className={`w-full h-full border-0 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        title={`${normalizedBlockType} preview`}
      />
    </div>
  );

  // Expanded view rendered in a portal for proper z-index - DESKTOP SIZE
  if (isExpanded && mounted) {
    return (
      <>
        {/* Placeholder to maintain layout */}
        <div className="h-[750px] bg-muted rounded-lg" />
        {createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/80"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="fixed inset-4 bg-white rounded-lg overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {headerControls}
              <div className="flex-1 overflow-hidden">
                {iframeContent}
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal view - iPhone frame (collapsible)
  return (
    <div className="relative">
      {headerControls}
      {!isCollapsed && (
        <div className="mx-auto w-[375px] bg-gray-900 rounded-[2.5rem] p-2 shadow-xl mt-4">
          {/* Screen */}
          <div className="bg-white rounded-[2rem] overflow-hidden h-[667px] relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20" />
            {/* Content */}
            <div className="h-full pt-6 overflow-hidden">
              {iframeContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
