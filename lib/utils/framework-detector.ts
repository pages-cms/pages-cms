/**
 * Framework detection utility for identifying static site generators.
 * Currently supports Astro detection for preview functionality.
 */

import { createOctokitInstance } from "@/lib/utils/octokit";

type Framework = 'astro' | 'unknown';

// Cache framework detection results (framework doesn't change often)
const frameworkCache = new Map<string, Framework>();

/**
 * Detects the framework used by a repository by checking package.json and config files.
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name
 * @param token - GitHub token for API access
 * @returns The detected framework type
 */
export async function detectFramework(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<Framework> {
  const cacheKey = `${owner}/${repo}/${branch}`;
  
  // Check cache first
  if (frameworkCache.has(cacheKey)) {
    return frameworkCache.get(cacheKey)!;
  }

  try {
    const octokit = createOctokitInstance(token);

    // Check package.json for astro dependency
    try {
      const packageJsonResponse = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'package.json',
        ref: branch
      });

      if (Array.isArray(packageJsonResponse.data) || packageJsonResponse.data.type !== 'file') {
        frameworkCache.set(cacheKey, 'unknown');
        return 'unknown';
      }

      const packageJsonContent = Buffer.from(packageJsonResponse.data.content, 'base64').toString();
      const packageJson = JSON.parse(packageJsonContent);

      // Check for astro in dependencies or devDependencies
      const hasAstro = 
        (packageJson.dependencies && packageJson.dependencies.astro) ||
        (packageJson.devDependencies && packageJson.devDependencies.astro);

      if (hasAstro) {
        frameworkCache.set(cacheKey, 'astro');
        return 'astro';
      }
    } catch (error: any) {
      // If package.json doesn't exist or can't be read, continue to check config files
      if (error.status !== 404) {
        console.warn(`Error reading package.json for ${cacheKey}:`, error.message);
      }
    }

    // Check for Astro config files
    const configFiles = ['astro.config.js', 'astro.config.mjs', 'astro.config.ts'];
    
    for (const configFile of configFiles) {
      try {
        const configResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: configFile,
          ref: branch
        });

        if (!Array.isArray(configResponse.data) && configResponse.data.type === 'file') {
          frameworkCache.set(cacheKey, 'astro');
          return 'astro';
        }
      } catch (error: any) {
        // Config file doesn't exist, continue checking
        if (error.status !== 404) {
          console.warn(`Error checking ${configFile} for ${cacheKey}:`, error.message);
        }
      }
    }

    // No Astro indicators found
    frameworkCache.set(cacheKey, 'unknown');
    return 'unknown';
  } catch (error: any) {
    console.error(`Error detecting framework for ${cacheKey}:`, error.message);
    frameworkCache.set(cacheKey, 'unknown');
    return 'unknown';
  }
}

/**
 * Clears the framework detection cache for a specific repository.
 * Useful when the repository structure might have changed.
 */
export function clearFrameworkCache(owner: string, repo: string, branch: string): void {
  const cacheKey = `${owner}/${repo}/${branch}`;
  frameworkCache.delete(cacheKey);
}

/**
 * Clears all framework detection cache.
 */
export function clearAllFrameworkCache(): void {
  frameworkCache.clear();
}

