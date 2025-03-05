import { User } from "@/types/user";
import { getFileExtension, normalizePath } from "./file";
import { createOctokitInstance } from "./octokit";
import { getToken } from "../token";
import { getConfig } from "./config";
import { deepMap, getSchemaByName } from "../schema";
import { parse } from "@/lib/serialization";
import { readFns } from "@/fields/registry";

export const getEntry = async (user: User, owner: string, repo: string, branch: string, path: string, name?: string) => {
  const token = await getToken(user, owner, repo);
  if (!token) throw new Error("Token not found");

  const octokit = createOctokitInstance(token);
  const normalizedPath = normalizePath(path);

  let config;
  let schema;

  if (name) {
    config = await getConfig(owner, repo, branch);
    if (!config) throw new Error(`Configuration not found for ${owner}/${repo}/${branch}.`);

    schema = getSchemaByName(config.object, name);
    if (!schema) throw new Error(`Schema not found for ${name}.`);

    if (!normalizedPath.startsWith(schema.path)) throw new Error(`Invalid path "${path}" for ${schema.type} "${name}".`);

    if (getFileExtension(normalizedPath) !== schema.extension) throw new Error(`Invalid extension "${getFileExtension(normalizedPath)}" for ${schema.type} "${name}".`);
  } else {
    config = {};
  }
  
  const response = await octokit.rest.repos.getContent({
    owner: owner,
    repo: repo,
    path: normalizedPath,
    ref: branch
  });
  
  if (Array.isArray(response.data)) {
    throw new Error("Expected a file but found a directory");
  } else if (response.data.type !== "file") {
    throw new Error("Invalid response type");
  }

  const content = Buffer.from(response.data.content, "base64").toString();
  const contentObject = name
    ? parseContent(content, schema, config)
    : { body: content };

  return {
    sha: response.data.sha,
    name: response.data.name,
    path: response.data.path,
    contentObject
  };
} 

export const parseContent = (
  content: string,
  schema: Record<string, any>,
  config: Record<string, any>
) => {
  const serializedTypes = ["yaml-frontmatter", "json-frontmatter", "toml-frontmatter", "yaml", "json", "toml"];
  
  let contentObject: Record<string, any> = {};

  if (serializedTypes.includes(schema && schema.format) && schema.fields && schema.fields.length > 0) {
    // If we are dealing with a serialized format and we have fields defined
    try {
      contentObject = parse(content, { format: schema.format, delimiters: schema.delimiters });
      // We resort to the same trick as with the client, wrapping things in a listWrapper object if we're dealing with a list at the root
      let entryFields;
      if (schema.list) {
        contentObject = { listWrapper: contentObject };
        entryFields = [{
          name: "listWrapper",
          type: "object",
          list: true,
          fields: schema.fields
        }]
      } else {
        entryFields = schema.fields;
      }

      contentObject = deepMap(
        contentObject,
        entryFields,
        (value, field) => {
          if (field.hidden) return;
          return readFns[field.type]
            ? readFns[field.type](value, field,  config)
            : value;
        }
      );
      if (schema.list) contentObject = contentObject.listWrapper;
    } catch (error: any) {
      throw new Error(`Error parsing frontmatter: ${error.message}`);
    }
  } else {
    contentObject = { body: content };
  }

  return contentObject; 
};