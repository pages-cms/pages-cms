'use client';

import { ReactNode, RefObject, LegacyRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Transform image paths from CMS format (public/uploads/...) to preview-accessible format (/uploads/...)
 */
export const transformImagePaths = (data: Record<string, unknown>): Record<string, unknown> => {
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

/**
 * Toolbar with refresh, external link, and expand/minimize buttons
 */
interface PreviewToolbarProps {
  onReload: () => void;
  onOpenNewTab: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  isLoaded: boolean;
}

export function PreviewToolbar({
  onReload,
  onOpenNewTab,
  onToggleExpand,
  isExpanded,
  isLoaded,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onReload}
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
            onClick={onOpenNewTab}
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
            onClick={onToggleExpand}
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
  );
}

/**
 * iPhone-style device frame for mobile preview
 */
interface IPhoneFrameProps {
  children: ReactNode;
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="mx-auto w-[375px] bg-gray-900 rounded-[2.5rem] p-2 shadow-xl mt-4">
      {/* Screen */}
      <div className="bg-white rounded-[2rem] overflow-hidden h-[667px] relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20" />
        {/* Content */}
        <div className="h-full pt-6 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Iframe with loading spinner overlay
 */
interface IFrameWrapperProps {
  url: string;
  title: string;
  onLoad: () => void;
  isLoaded: boolean;
  iframeRef: LegacyRef<HTMLIFrameElement>;
  refreshKey: number;
}

export function IFrameWrapper({
  url,
  title,
  onLoad,
  isLoaded,
  iframeRef,
  refreshKey,
}: IFrameWrapperProps) {
  return (
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
        key={refreshKey}
        ref={iframeRef}
        src={url}
        onLoad={onLoad}
        className={`w-full h-full border-0 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        title={title}
      />
    </div>
  );
}

/**
 * Full-screen modal for expanded preview (renders via portal)
 */
interface ExpandedPreviewModalProps {
  headerContent: ReactNode;
  iframeContent: ReactNode;
  onClose: () => void;
}

export function ExpandedPreviewModal({
  headerContent,
  iframeContent,
  onClose,
}: ExpandedPreviewModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80"
      onClick={onClose}
    >
      <div
        className="fixed inset-4 bg-white rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {headerContent}
        <div className="flex-1 overflow-hidden">
          {iframeContent}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Collapsible section header for previews
 */
interface CollapsiblePreviewSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsiblePreviewSection({
  title,
  isCollapsed,
  onToggle,
  children,
}: CollapsiblePreviewSectionProps) {
  return (
    <div className="relative">
      {/* Section header with collapse toggle */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-t-lg px-1 py-1 -mx-1"
        onClick={onToggle}
      >
        <span className="text-sm font-medium">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
