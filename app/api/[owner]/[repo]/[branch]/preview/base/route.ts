import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { getConfig } from "@/lib/utils/config";
import { getSchemaByName, mapFilePathToPreviewUrl } from "@/lib/schema";
import { detectFramework } from "@/lib/utils/framework-detector";

/**
 * Base HTML endpoint - fetches the base HTML for a preview page.
 * This is called once, then client-side does markdown rendering and DOM injection.
 * 
 * GET /api/[owner]/[repo]/[branch]/preview/base?filePath=...&name=...
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("filePath");
    const schemaName = searchParams.get("name");

    if (!filePath || !schemaName) {
      throw new Error("Missing filePath or name query parameters");
    }

    const config = await getConfig(params.owner, params.repo, params.branch);
    if (!config) throw new Error(`Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`);

    const schema = getSchemaByName(config.object, schemaName);
    if (!schema) throw new Error(`Schema not found for ${schemaName}.`);

    if (!schema.preview || !schema.preview.url) {
      throw new Error("Preview is not configured for this collection.");
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Pages-CMS-Preview/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Page not found at ${pageUrl}.`);
        }
        if (response.status === 403) {
          throw new Error(`Access forbidden to ${pageUrl}.`);
        }
        throw new Error(`Failed to fetch preview page: ${response.status} ${response.statusText}.`);
      }

      pageHtml = await response.text();
    } catch (error: any) {
      const errorString = error.message.toLowerCase();
      if (error.name === 'AbortError') {
        throw new Error(`Request to ${pageUrl} timed out after 10 seconds.`);
      }
      if (errorString.includes('econnrefused') || errorString.includes('enotfound')) {
        throw new Error(`Unable to connect to ${pageUrl}.`);
      }
      throw new Error(`Error fetching preview from ${pageUrl}: ${error.message || error.toString()}`);
    }

    return Response.json({
      status: "success",
      data: {
        html: pageHtml,
        pageUrl,
        contentSelector,
      }
    });
  } catch (error: any) {
    console.error('Preview base API error:', error);
    return Response.json({
      status: "error",
      message: error.message || "An error occurred while fetching the base preview.",
    }, { status: 500 });
  }
}

