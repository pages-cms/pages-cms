"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useConfig } from "@/contexts/config-context";
import { getSchemaByName } from "@/lib/schema";
import { Loader, AlertCircle } from "lucide-react";

interface EntryPreviewProps {
  formData: Record<string, any>;
  filePath: string;
  schemaName: string;
  isOpen: boolean;
}

export function EntryPreview({ formData, filePath, schemaName, isOpen }: EntryPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const { config } = useConfig();

  // Debounce the form data to avoid excessive API calls
  const [debouncedData] = useDebounce(formData, 400);

  useEffect(() => {
    if (!isOpen || !config || !schemaName) return;

    const schema = getSchemaByName(config.object, schemaName);
    if (!schema || !schema.preview || !schema.preview.url) {
      setError("Preview is not configured for this collection. Add a 'preview' section with a 'url' in your .pages.yml config.");
      return;
    }

    // Don't fetch if we don't have a file path (new file)
    if (!filePath) {
      setError("Save the file first to generate a preview URL.");
      return;
    }

    // Only fetch if we have form data
    if (!debouncedData || Object.keys(debouncedData).length === 0) {
      return;
    }

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/preview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              formData: debouncedData,
              filePath: filePath,
              name: schemaName,
            }),
          }
        );

        const data = await response.json();

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to generate preview");
        }

        setPreviewHtml(data.data.html);
      } catch (err: any) {
        console.error("Preview error:", err);
        setError(err.message || "An error occurred while generating the preview.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [debouncedData, isOpen, config, schemaName, filePath]);

  // Save scroll position before updating iframe content
  const saveScrollPosition = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        const iframe = iframeRef.current;
        const scrollX = iframe.contentWindow.scrollX || iframe.contentWindow.pageXOffset || 0;
        const scrollY = iframe.contentWindow.scrollY || iframe.contentWindow.pageYOffset || 0;
        scrollPositionRef.current = { x: scrollX, y: scrollY };
      } catch (e) {
        // Cross-origin or other error, ignore
        scrollPositionRef.current = null;
      }
    }
  };

  // Restore scroll position after iframe content loads
  const restoreScrollPosition = () => {
    if (iframeRef.current?.contentWindow && scrollPositionRef.current) {
      try {
        const iframe = iframeRef.current;
        const { x, y } = scrollPositionRef.current;
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.scrollTo(x, y);
          }
        });
      } catch (e) {
        // Cross-origin or other error, ignore
      }
    }
  };

  // Update iframe content when preview HTML changes
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const iframe = iframeRef.current;
      
      // Save scroll position before updating
      saveScrollPosition();
      
      // Set up load handler to restore scroll position
      const handleLoad = () => {
        restoreScrollPosition();
        iframe.removeEventListener('load', handleLoad);
      };
      
      iframe.addEventListener('load', handleLoad);
      
      // Update the iframe content
      iframe.srcdoc = previewHtml;
      
      // Also try to restore after a short delay as a fallback
      // (in case load event fires before content is fully rendered)
      const timeoutId = setTimeout(() => {
        restoreScrollPosition();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        iframe.removeEventListener('load', handleLoad);
      };
    }
  }, [previewHtml]);

  if (!isOpen) return null;

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Configuration not found</p>
        </div>
      </div>
    );
  }

  const schema = getSchemaByName(config.object, schemaName);
  if (!schema || !schema.preview || !schema.preview.url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium mb-2">Preview not configured</p>
          <p className="text-sm mt-1 mb-3">Add a preview section to your collection in <code className="bg-muted px-1 py-0.5 rounded text-xs">.pages.yml</code>:</p>
          <pre className="text-xs bg-muted p-3 rounded text-left overflow-auto">
{`content:
  - name: ${schemaName}
    preview:
      url: https://your-site.com
      enabled: true
      selector: main`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background border-l">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generating preview...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Preview Error</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {previewHtml ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Content Preview"
            sandbox="allow-same-origin allow-scripts"
            style={{ minHeight: "100%" }}
          />
        ) : !isLoading && !error ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Start editing to see preview</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

