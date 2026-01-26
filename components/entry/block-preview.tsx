'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BlockPreviewProps {
  blockType: string;
  blockData: Record<string, unknown>;
  previewBaseUrl: string;
}

export function BlockPreview({
  blockType,
  blockData,
  previewBaseUrl,
}: BlockPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [key, setKey] = useState(0);

  // Normalize block type: convert underscores to hyphens
  const normalizedBlockType = blockType.replace(/_/g, '-');
  const previewUrl = `${previewBaseUrl}/preview/${normalizedBlockType}`;

  // Send data to iframe when loaded and data changes
  const sendData = useCallback(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_PREVIEW', blockData },
        '*'
      );
    }
  }, [blockData, isLoaded]);

  // Send data whenever it changes
  useEffect(() => {
    sendData();
  }, [sendData]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Reload iframe
  const handleReload = () => {
    setIsLoaded(false);
    setKey((k) => k + 1);
  };

  return (
    <div
      className={`relative bg-muted rounded-lg overflow-hidden transition-all ${
        isExpanded ? 'fixed inset-4 z-50' : 'h-[400px]'
      }`}
    >
      {/* Overlay background when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b">
        <span className="text-sm font-medium text-muted-foreground">
          {normalizedBlockType} preview
        </span>
        <div className="flex items-center gap-1">
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

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading preview...</span>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={previewUrl}
        onLoad={handleLoad}
        className={`w-full h-full border-0 pt-10 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        title={`${normalizedBlockType} preview`}
      />
    </div>
  );
}
