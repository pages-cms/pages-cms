export const maxDuration = 30;

import { type NextRequest } from "next/server";
import { createOctokitInstance } from "@/lib/utils/octokit"
import { readFns } from "@/fields/registry";
import { parse } from "@/lib/serialization";
import { deepMap, getDateFromFilename, getSchemaByName } from "@/lib/schema";
import { getConfig } from "@/lib/utils/config";
import { normalizePath } from "@/lib/utils/file";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string, repo: string, branch: string, name: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const config = await getConfig(params.owner, params.repo, params.branch);
    if (!config) throw new Error(`Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`);

    const schema = getSchemaByName(config.object, params.name);
    if (!schema) throw new Error(`Schema not found for ${params.name}.`);

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path") || "";
    const normalizedPath = normalizePath(path);
    if (!normalizedPath.startsWith(schema.path)) throw new Error(`Invalid path "${path}" for collection "${params.name}".`);
    
    const octokit = createOctokitInstance(token);
    const query = `
      query ($owner: String!, $repo: String!, $expression: String!) {
        repository(owner: $owner, name: $repo) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
                path
                type
                object {
                  ... on Blob {
                    text
                    oid
                  }
                  ... on Tree {
                    entries {
                      name
                      path
                      type
                      object {
                        ... on Blob {
                          text
                          oid
                        }
                        ... on Tree {
                          entries {
                            name
                            path
                            type
                            object {
                              ... on Blob {
                                text
                                oid
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const expression = `${params.branch}:${normalizedPath}`;
    const response: any = await octokit.graphql(query, { owner: params.owner, repo: params.repo, expression });
    // TODO: handle 401 / Bad credentials error

    const entries = response.repository?.object?.entries;

    if (entries === undefined) throw new Error("Not found");

    let data: {
      contents: Record<string, any>[],
      errors: string[]
    } = {
      contents: [],
      errors: []
    };

    if (entries) data  = parseContents(entries, schema, config);

    return Response.json({
      status: "success",
      data
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
}

const parseContents = (
  contents: any,
  schema: Record<string, any>,
  config: Record<string, any>,
): {
  contents: Record<string, any>[],
  errors: string[]
} => {
  const serializedTypes = ["yaml-frontmatter", "json-frontmatter", "toml-frontmatter", "yaml", "json", "toml"];
  const excludedFiles = schema.exclude || [];

  let parsedContents: Record<string, any>[] = [];
  let parsedErrors: string[] = [];

  const parseEntry = (item: any): any => {
    if (item.type === "blob" && (item.path.endsWith(`.${schema.extension}`) || schema.extension === "") && !excludedFiles.includes(item.name)) {
      let contentObject: Record<string, any> = {};
      
      if (serializedTypes.includes(schema.format) && schema.fields) {
        try {
          contentObject = parse(item.object.text, { format: schema.format, delimiters: schema.delimiters });
          contentObject = deepMap(contentObject, schema.fields, (value, field) => readFns[field.type] ? readFns[field.type](value, field, config) : value);
        } catch (error: any) {
          console.error(`Error parsing frontmatter for file "${item.path}": ${error.message}`);
          parsedErrors.push(`Error parsing frontmatter for file "${item.path}": ${error.message}`);
        }
      }

      if (!schema.fields || schema.fields.length === 0) {
        contentObject.name = item.name;
      }
      
      if (!contentObject.date && schema.filename.startsWith("{year}-{month}-{day}")) {
        const filenameDate = getDateFromFilename(item.name);
        if (filenameDate) {
          contentObject.date = filenameDate.string;
        }
      }

      return {
        sha: item.object.oid,
        name: item.name,
        path: item.path,
        content: item.object.text,
        object: contentObject,
        type: "file",
      };
    } else if (item.type === "tree") {
      const children = item.object?.entries?.map(parseEntry).filter(Boolean) || [];
      return {
        name: item.name,
        path: item.path,
        type: "dir",
        children
      };
    }
    return null;
  };

  parsedContents = contents.map(parseEntry).filter(Boolean);

  return {
    contents: parsedContents,
    errors: parsedErrors
  }
}