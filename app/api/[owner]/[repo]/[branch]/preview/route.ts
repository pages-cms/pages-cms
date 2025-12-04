import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { getConfig } from "@/lib/utils/config";
import { getSchemaByName, mapFilePathToPreviewUrl, deepMap, generateZodSchema, sanitizeObject } from "@/lib/schema";
import { stringify } from "@/lib/serialization";
import { writeFns } from "@/fields/registry";
import { normalizePath } from "@/lib/utils/file";
import { detectFramework } from "@/lib/utils/framework-detector";
import * as cheerio from "cheerio";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

/**
 * Preview API endpoint for real-time content preview.
 * 
 * POST /api/[owner]/[repo]/[branch]/preview
 * 
 * Accepts:
 * - formData: Current form values
 * - filePath: Path to the file being edited
 * - name: Schema name
 * 
 * Returns modified HTML with updated content injected.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const body = await request.json();
    const { formData, filePath, name } = body;

    if (!formData || !filePath || !name) {
      throw new Error("Missing required fields: formData, filePath, or name");
    }

    const config = await getConfig(params.owner, params.repo, params.branch);
    if (!config) throw new Error(`Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`);

    const schema = getSchemaByName(config.object, name);
    if (!schema) throw new Error(`Schema not found for ${name}.`);

    // Check if preview is configured
    if (!schema.preview || !schema.preview.url) {
      throw new Error("Preview is not configured for this collection. Add a 'preview' section with a 'url' in your config.");
    }

    const previewUrl = schema.preview.url;
    const contentSelector = schema.preview.selector || "main";

    // Detect framework
    const framework = await detectFramework(params.owner, params.repo, params.branch, token);
    
    if (framework !== 'astro') {
      return Response.json({
        status: "error",
        message: "Preview is only available for Astro sites in this MVP version.",
      }, { status: 400 });
    }

    // Map file path to preview URL
    const pageUrl = mapFilePathToPreviewUrl(filePath, schema, previewUrl);


    // Fetch the actual page HTML
    let pageHtml: string;
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Pages-CMS-Preview/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Provide more helpful error messages for common status codes
        if (response.status === 404) {
          throw new Error(`Page not found at ${pageUrl}. The URL might be incorrect. Check your file path mapping in the preview config.`);
        }
        if (response.status === 403) {
          throw new Error(`Access forbidden to ${pageUrl}. The site may require authentication or have access restrictions.`);
        }
        throw new Error(`Failed to fetch preview page: ${response.status} ${response.statusText}. URL: ${pageUrl}`);
      }

      pageHtml = await response.text();
    } catch (error: any) {
      // Log the actual error for debugging
      console.error('[Preview] Fetch error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        url: pageUrl
      });

      // Handle different types of errors
      if (error.name === 'AbortError') {
        throw new Error(`Request to ${pageUrl} timed out after 10 seconds. The site may be slow or unreachable.`);
      }
      
      // Check for connection errors
      const errorMessage = error.message || error.toString() || '';
      const errorString = errorMessage.toLowerCase();
      
      if (errorString.includes('econnrefused') || errorString.includes('enotfound') || errorString.includes('getaddrinfo')) {
        throw new Error(`Unable to connect to ${pageUrl}. Check that the URL is correct and the site is accessible.`);
      }
      
      if (errorString.includes('certificate') || errorString.includes('ssl') || errorString.includes('tls')) {
        throw new Error(`SSL/TLS error when connecting to ${pageUrl}. The site's certificate may be invalid.`);
      }
      
      // Check if it's a TypeError (common with fetch failures)
      if (error instanceof TypeError) {
        throw new Error(`Network error when fetching ${pageUrl}. ${error.message || 'The site may be down or unreachable.'}`);
      }
      
      // Re-throw with more context if it's already a formatted error
      if (error.message && error.message.includes('Failed to fetch preview page')) {
        throw error;
      }
      
      // Generic error with actual message
      throw new Error(`Error fetching preview from ${pageUrl}: ${error.message || error.toString()}`);
    }

    // Transform form data and extract content for preview
    let transformedContent: string;
    
    if (schema.fields && schema.fields.length > 0) {
      // Handle list wrapper if needed
      let contentObject;
      let contentFields;

      if (schema.list) {
        contentObject = { listWrapper: formData };
        contentFields = [{
          name: "listWrapper",
          type: "object",
          list: true,
          fields: schema.fields
        }];
      } else {
        contentObject = formData;
        contentFields = schema.fields;
      }

      // Validate with Zod schema
      const zodSchema = generateZodSchema(contentFields);
      const zodValidation = zodSchema.safeParse(contentObject);

      if (zodValidation.success === false) {
        const errorMessages = zodValidation.error.errors.map((error: any) => {
          let message = error.message;
          if (error.path.length > 0) message = `${message} at ${error.path.join(".")}`;
          return message;
        });
        throw new Error(`Content validation failed: ${errorMessages.join(", ")}`);
      }

      // Transform content using field write functions
      const transformedObject = deepMap(
        zodValidation.data,
        contentFields,
        (value, field) => {
          const fieldType = field.type as string;
          // Use standard write functions for transformation
          return writeFns[fieldType] ? writeFns[fieldType](value, field, config) : value;
        }
      );

      const unwrappedContentObject = schema.list
        ? transformedObject.listWrapper
        : transformedObject;

      // Find the main content field(s) to render
      // Look for "body" field first, then check for markdown/rich-text fields
      let bodyField: any = null;
      let bodyValue: string = '';

      // Check for "body" field
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

      // Render the content based on field type
      if (bodyField) {
        const fieldType = bodyField.type;
        
        if (fieldType === 'rich-text') {
          // Rich-text fields: check if value is HTML or markdown
          // If it contains markdown patterns but no HTML tags, render it as markdown
          const looksLikeMarkdown = bodyValue.includes('#') && 
                                     bodyValue.includes('\n') && 
                                     !bodyValue.trim().startsWith('<') &&
                                     !bodyValue.includes('<p>') &&
                                     !bodyValue.includes('<div>');
          
          if (looksLikeMarkdown && framework === 'astro') {
            console.log(`[Preview] Rich-text field contains markdown, rendering it`);
            transformedContent = await renderMarkdownWithRemark(bodyValue);
          } else {
            // Rich-text fields already contain HTML from TipTap
            transformedContent = bodyValue;
          }
        } else if (fieldType === 'code' || fieldType === 'text') {
          // Check if it's markdown format
          // For code fields, check the format option or file extension
          const fieldFormat = bodyField.options?.format;
          const isMarkdown = fieldFormat === 'markdown' || 
                            fieldFormat === 'md' ||
                            (fieldType === 'code' && (!fieldFormat || fieldFormat === 'markdown' || fieldFormat === 'md')) ||
                            (fieldType === 'text' && !fieldFormat);
          
          if (isMarkdown && framework === 'astro') {
            // Render markdown using remark/rehype for Astro
            transformedContent = await renderMarkdownWithRemark(bodyValue);
          } else {
            // For other formats or non-Astro, use as-is or escape
            transformedContent = bodyValue;
          }
        } else {
          transformedContent = bodyValue;
        }
      } else {
        // No body field found, try to render all content as HTML
        transformedContent = '';
      }
    } else {
      // No fields defined, treat as raw content
      transformedContent = formData.body || '';
      
      // If it looks like markdown, render it
      if (transformedContent && framework === 'astro') {
        transformedContent = await renderMarkdownWithRemark(transformedContent);
      }
    }

    // Parse HTML and inject updated content
    const $ = cheerio.load(pageHtml);
    
    // Try to find a more specific content area (like article > main, or a content wrapper)
    // First try the configured selector
    let $contentArea = $(contentSelector);
    
    // If selector is generic (like "main"), try to find a more specific content area within it
    if ($contentArea.length > 0 && (contentSelector === 'main' || contentSelector === 'article')) {
      // Look for common content containers within main/article
      const innerSelectors = [
        'article > .content',
        'article > .prose',
        'article > [class*="content"]',
        'main > .content',
        'main > .prose',
        'main > [class*="content"]',
        'article > section',
        'main > section',
      ];
      
      for (const innerSelector of innerSelectors) {
        const $inner = $contentArea.find(innerSelector).first();
        if ($inner.length > 0) {
          $contentArea = $inner;
          break;
        }
      }
    }
    
    if ($contentArea.length === 0) {
      // Try fallback selectors
      const fallbackSelectors = ['article', 'main', '.content', '#content', '.prose', '[class*="content"]'];
      let found = false;
      
      for (const selector of fallbackSelectors) {
        const $fallback = $(selector);
        if ($fallback.length > 0) {
          $contentArea = $fallback;
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Content selector "${contentSelector}" not found on the page. Tried: ${contentSelector}, ${fallbackSelectors.join(', ')}`);
      }
    }
    
    // Inject content into the configured selector
    // For most sites, the selector should be specific enough (e.g., "main .prose", "article .content")
    // If the selector is generic like "main", try to find a more specific content area within it
    let contentInjected = false;
    
    // If selector is generic (just "main" or "article"), try to find a more specific content area
    if (contentSelector === 'main' || contentSelector === 'article') {
      // Try common content wrapper patterns within the main/article
      const contentWrapperSelectors = [
        '.prose',
        '.markdown',
        '[class*="prose"]',
        '[class*="markdown"]',
        '.content',
        '[class*="content"]',
        'section',
        '[role="article"]',
      ];
      
      for (const wrapperSelector of contentWrapperSelectors) {
        const $wrapper = $contentArea.find(wrapperSelector).first();
        if ($wrapper.length > 0) {
          console.log(`[Preview] Found content wrapper "${wrapperSelector}" within "${contentSelector}", replacing content`);
          $wrapper.empty().html(transformedContent);
          contentInjected = true;
          break;
        }
      }
    }
    
    // If no wrapper found or selector is already specific, inject directly into the content area
    if (!contentInjected) {
      console.log(`[Preview] Injecting content directly into "${contentSelector}"`);
      // Try to preserve structure by keeping headers/footers if they exist
      const $header = $contentArea.find('> header').first();
      const $footer = $contentArea.find('> footer').first();
      
      if ($header.length > 0 || $footer.length > 0) {
        // Preserve header and footer, replace everything else
        const headerHtml = $header.length > 0 ? $.html($header) : '';
        const footerHtml = $footer.length > 0 ? $.html($footer) : '';
        $contentArea.empty();
        if (headerHtml) $contentArea.append($(headerHtml));
        $contentArea.append(transformedContent);
        if (footerHtml) $contentArea.append($(footerHtml));
      } else {
        // No header/footer, just replace the content
        $contentArea.empty().html(transformedContent);
      }
    }

    // Convert relative URLs to absolute URLs in the preview HTML
    $('a[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        $(el).attr('href', new URL(href, previewUrl).href);
      }
    });

    $('img[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        $(el).attr('src', new URL(src, previewUrl).href);
      }
    });

    $('link[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        $(el).attr('href', new URL(href, previewUrl).href);
      }
    });

    $('script[src^="/"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        $(el).attr('src', new URL(src, previewUrl).href);
      }
    });

    const modifiedHtml = $.html();

    return Response.json({
      status: "success",
      data: {
        html: modifiedHtml,
      }
    });
  } catch (error: any) {
    console.error('Preview API error:', error);
    return Response.json({
      status: "error",
      message: error.message || "An error occurred while generating the preview.",
    }, { status: 500 });
  }
}

/**
 * Renders markdown to HTML using remark/rehype pipeline (matching Astro's rendering)
 */
async function renderMarkdownWithRemark(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Use a more permissive sanitize schema to preserve common HTML elements
    const file = await remark()
      .use(remarkGfm) // GitHub Flavored Markdown
      .use(remarkRehype, { allowDangerousHtml: false }) // Convert to HTML AST
      .use(rehypeSanitize, {
        // Allow common HTML elements and attributes
        tagNames: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'],
        attributes: {
          '*': ['class', 'id'],
          'a': ['href', 'title', 'target', 'rel'],
          'img': ['src', 'alt', 'title', 'width', 'height'],
          'code': ['class'],
          'pre': ['class'],
        },
      })
      .use(rehypeStringify) // Convert to HTML string
      .process(markdown);

    return String(file);
  } catch (error: any) {
    console.error('[Preview] Error rendering markdown:', error);
    // Return escaped HTML if rendering fails
    return markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

