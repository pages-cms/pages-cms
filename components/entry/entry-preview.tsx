"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useConfig } from "@/contexts/config-context";
import { getSchemaByName } from "@/lib/schema";
import { Loader, AlertCircle } from "lucide-react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

interface EntryPreviewProps {
  formData: Record<string, any>;
  filePath: string;
  schemaName: string;
  isOpen: boolean;
}

export function EntryPreview({ formData, filePath, schemaName, isOpen }: EntryPreviewProps) {
  const [baseHtml, setBaseHtml] = useState<string>("");
  const [contentSelector, setContentSelector] = useState<string>("main");
  const [isLoadingBase, setIsLoadingBase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const baseHtmlRef = useRef<string>("");
  const renderedContentRef = useRef<string>("");
  const iframeLoadedRef = useRef<boolean>(false);
  const targetElementRef = useRef<Element | null>(null);
  const { config } = useConfig();

  // Debounce the form data to avoid excessive processing
  const [debouncedData] = useDebounce(formData, 300);

  // Fetch base HTML once when filePath changes
  useEffect(() => {
    if (!isOpen || !config || !schemaName || !filePath) return;

    const schema = getSchemaByName(config.object, schemaName);
    if (!schema || !schema.preview || !schema.preview.url) {
      setError("Preview is not configured for this collection. Add a 'preview' section with a 'url' in your .pages.yml config.");
      return;
    }

    const fetchBaseHtml = async () => {
      setIsLoadingBase(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/preview/base?filePath=${encodeURIComponent(filePath)}&name=${encodeURIComponent(schemaName)}`
        );

        const data = await response.json();

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to fetch base preview");
        }

        setBaseHtml(data.data.html);
        baseHtmlRef.current = data.data.html;
        setContentSelector(data.data.contentSelector || "main");
        iframeLoadedRef.current = false; // Reset flag so iframe reloads with new base HTML
      } catch (err: any) {
        console.error("Preview base error:", err);
        setError(err.message || "An error occurred while fetching the base preview.");
      } finally {
        setIsLoadingBase(false);
      }
    };

    fetchBaseHtml();
  }, [filePath, isOpen, config, schemaName]);

  // Extract body field and render markdown client-side
  useEffect(() => {
    if (!baseHtml || !debouncedData || !config || !schemaName) {
      renderedContentRef.current = "";
      return;
    }

    const processContent = async () => {
      const schema = getSchemaByName(config.object, schemaName);
      if (!schema || !schema.fields || schema.fields.length === 0) {
        renderedContentRef.current = "";
        return;
      }

      // Handle list wrapper if needed
      let contentObject = debouncedData;
      let contentFields = schema.list 
        ? [{ name: "listWrapper", type: "object", list: true, fields: schema.fields }]
        : schema.fields;

      // Unwrap if list
      const unwrappedContentObject = schema.list && contentObject.listWrapper
        ? contentObject.listWrapper
        : contentObject;

      // Find body field
      let bodyField: any = null;
      let bodyValue: string = '';

      if (unwrappedContentObject.body !== undefined) {
        bodyField = contentFields.find((f: any) => f.name === 'body');
        bodyValue = unwrappedContentObject.body || '';
      } else {
        // Find the first markdown, rich-text, or code field
        for (const field of contentFields) {
          const fieldType = field.type;
          if (fieldType === 'rich-text' || fieldType === 'code' || fieldType === 'text') {
            const fieldValue = unwrappedContentObject[field.name];
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
              bodyField = field;
              bodyValue = fieldValue;
              break;
            }
          }
        }
      }

      if (!bodyField || !bodyValue) {
        renderedContentRef.current = "";
        return;
      }

      // Render markdown if needed
      const fieldType = bodyField.type;
      let renderedHtml = bodyValue;

      if (fieldType === 'rich-text') {
        // Check if it's markdown
        const looksLikeMarkdown = bodyValue.includes('#') && 
                                   bodyValue.includes('\n') && 
                                   !bodyValue.trim().startsWith('<') &&
                                   !bodyValue.includes('<p>') &&
                                   !bodyValue.includes('<div>');
        
        if (looksLikeMarkdown) {
          try {
            const file = await remark()
              .use(remarkGfm)
              .use(remarkRehype, { allowDangerousHtml: false })
              .use(rehypeSanitize, {
                tagNames: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'],
                attributes: {
                  '*': ['class', 'id'],
                  'a': ['href', 'title', 'target', 'rel'],
                  'img': ['src', 'alt', 'title', 'width', 'height'],
                  'code': ['class'],
                  'pre': ['class'],
                },
              })
              .use(rehypeStringify)
              .process(bodyValue);
            renderedHtml = String(file);
          } catch (e) {
            console.error('Error rendering markdown:', e);
          }
        }
      } else if (fieldType === 'code' || fieldType === 'text') {
        const fieldFormat = bodyField.options?.format;
        const isMarkdown = fieldFormat === 'markdown' || 
                          fieldFormat === 'md' ||
                          (fieldType === 'code' && (!fieldFormat || fieldFormat === 'markdown' || fieldFormat === 'md')) ||
                          (fieldType === 'text' && !fieldFormat);
        
        if (isMarkdown) {
          try {
            const file = await remark()
              .use(remarkGfm)
              .use(remarkRehype, { allowDangerousHtml: false })
              .use(rehypeSanitize, {
                tagNames: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'],
                attributes: {
                  '*': ['class', 'id'],
                  'a': ['href', 'title', 'target', 'rel'],
                  'img': ['src', 'alt', 'title', 'width', 'height'],
                  'code': ['class'],
                  'pre': ['class'],
                },
              })
              .use(rehypeStringify)
              .process(bodyValue);
            renderedHtml = String(file);
          } catch (e) {
            console.error('Error rendering markdown:', e);
          }
        }
      }

      renderedContentRef.current = renderedHtml;
      
      // Update iframe after rendering
      updateIframeContent(renderedHtml);
    };

    processContent();
  }, [baseHtml, debouncedData, config, schemaName, contentSelector]);

  // Load base HTML into iframe once
  useEffect(() => {
    if (!iframeRef.current || !baseHtml || iframeLoadedRef.current) return;

    const iframe = iframeRef.current;
    
    const handleLoad = () => {
      iframeLoadedRef.current = true;
      
      // Find and store reference to target element
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        // Find content area
        let targetElement = iframeDoc.querySelector(contentSelector);
        
        if (!targetElement) {
          // Try fallback selectors
          const fallbackSelectors = ['article', 'main', '.content', '#content', '.prose', '[class*="content"]'];
          for (const selector of fallbackSelectors) {
            const found = iframeDoc.querySelector(selector);
            if (found) {
              targetElement = found;
              break;
            }
          }
        }

        if (targetElement) {
          // Try to find a content wrapper within the selector
          if (contentSelector === 'main' || contentSelector === 'article') {
            const wrapper = targetElement.querySelector('.prose, .markdown, [class*="prose"], [class*="markdown"], section, [role="article"]');
            if (wrapper) {
              targetElementRef.current = wrapper;
            } else {
              targetElementRef.current = targetElement;
            }
          } else {
            targetElementRef.current = targetElement;
          }
        }
      } catch (e) {
        console.error('Error finding target element:', e);
      }
    };

    // Set base HTML
    iframe.srcdoc = baseHtml;
    
    // Wait for iframe to load
    iframe.addEventListener('load', handleLoad, { once: true });
    
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [baseHtml, contentSelector]);

  // Update iframe DOM directly when content changes (no reload!)
  const updateIframeContent = (html: string) => {
    if (!iframeRef.current || !html || !iframeLoadedRef.current) return;

    saveScrollPosition();

    const iframe = iframeRef.current;
    
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Use cached target element or find it again
      let targetElement = targetElementRef.current;
      
      if (!targetElement) {
        // Find content area
        targetElement = iframeDoc.querySelector(contentSelector);
        
        if (!targetElement) {
          // Try fallback selectors
          const fallbackSelectors = ['article', 'main', '.content', '#content', '.prose', '[class*="content"]'];
          for (const selector of fallbackSelectors) {
            const found = iframeDoc.querySelector(selector);
            if (found) {
              targetElement = found;
              break;
            }
          }
        }

        if (targetElement) {
          // Try to find a content wrapper within the selector
          if (contentSelector === 'main' || contentSelector === 'article') {
            const wrapper = targetElement.querySelector('.prose, .markdown, [class*="prose"], [class*="markdown"], section, [role="article"]');
            if (wrapper) {
              targetElement = wrapper;
            }
          }
          targetElementRef.current = targetElement;
        }
      }

      if (targetElement) {
        // Directly update innerHTML - no reload!
        targetElement.innerHTML = html;
        
        // Restore scroll immediately (no delay needed since no reload)
        requestAnimationFrame(() => {
          restoreScrollPosition();
        });
      }
    } catch (e) {
      console.error('Error updating iframe content:', e);
    }
  };

  // Save scroll position before updating iframe content
  const saveScrollPosition = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    
    try {
      const scrollX = iframe.contentWindow.scrollX || iframe.contentWindow.pageXOffset || 0;
      const scrollY = iframe.contentWindow.scrollY || iframe.contentWindow.pageYOffset || 0;
      scrollPositionRef.current = { x: scrollX, y: scrollY };
    } catch (e) {
      // Cross-origin or other error, ignore
      scrollPositionRef.current = null;
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
      {isLoadingBase && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
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
        {baseHtml ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Content Preview"
            sandbox="allow-same-origin allow-scripts"
            style={{ minHeight: "100%" }}
          />
        ) : !isLoadingBase && !error ? (
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

