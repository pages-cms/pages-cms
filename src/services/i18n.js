import { Base64 } from "js-base64";
import github from "@/services/github";
import serialization from "@/services/serialization";
import useSchema from "@/composables/useSchema";

const { getSchemaByPath, sanitizeObject } = useSchema();
const serializedTypes = ['yaml-frontmatter', 'json-frontmatter', 'toml-frontmatter', 'yaml', 'json', 'toml'];

/**
 * Function to strip the content root from a given path.
 * Removes the content root prefix if it exists in the path.
 */
const stripContentRoot = (contentRoot, path) => {
  return contentRoot && path.startsWith(contentRoot)
    ? path.slice(contentRoot.length).replace(/^\//, "")
    : path;
};

/**
 * Save locale-specific files based on the content model, current path, and configuration.
 * Handles creating, updating, and deleting locale files depending on the `published` status.
 */
const saveLocaleFiles = async (model, currentPath, mode, props, repoStore) => {
  const config = repoStore?.config?.document;
  if (!config || !config.i18n?.locales || config.i18n.locales.length === 0)
    return;

  const schema = getSchemaByPath(config, currentPath);
  if (!schema) return;

  const contentRoot = schema.path ? schema.path.replace(/^\/|\/$/g, "") : "";
  const relativePath = stripContentRoot(contentRoot, currentPath);

  const publishControl = config.i18n?.publish_control || false;
  const isPublished = model?.published ?? true;

  // Delete locale files if content is unpublished
  if (publishControl && !isPublished) {
    await deleteLocaleFiles(currentPath, props, repoStore);
    return;
  }

  // Extract fields into shared and localized categories
  const { sharedFields, localizedFields } = extractFieldsByLocale(
    model,
    config.i18n.locales
  );

  for (const { name: locale, path: basePath } of config.i18n.locales) {
    const localeFilePath = `${basePath}${relativePath}`;

    // Fetch existing file SHA if it exists
    let localeFileSha = null;
    try {
      const localeFileData = await github.getFile(
        props.owner,
        props.repo,
        props.branch,
        localeFilePath
      );
      localeFileSha = localeFileData?.sha || null;
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }

    // Generate content for the locale file
    const localeContent = generateLocaleContent(
      sharedFields,
      localizedFields[locale] || {},
      schema,
      mode
    );

    // Save the file with the generated content
    await github.saveFile(
      props.owner,
      props.repo,
      props.branch,
      localeFilePath,
      Base64.encode(localeContent),
      localeFileSha,
      true
    );
  }
};

/**
 * Extracts fields into shared and localized categories based on locale suffixes.
 * Returns an object containing shared fields and fields localized per locale.
 */
function extractFieldsByLocale(model, locales) {
  const sharedFields = {};
  const localizedFields = {};

  Object.keys(model).forEach((key) => {
    const localeSuffix = locales.find((localeConfig) =>
      key.endsWith(`_${localeConfig.name}`)
    );
    if (localeSuffix) {
      const fieldName = key.replace(`_${localeSuffix.name}`, "");
      localizedFields[localeSuffix.name] = {
        ...localizedFields[localeSuffix.name],
        [fieldName]: model[key],
      };
    } else {
      sharedFields[key] = model[key];
    }
  });

  return { sharedFields, localizedFields };
}

/**
 * Generates content for locale-specific files using serialization.
 * Converts the content into the appropriate format based on the schema.
 */
function generateLocaleContent(sharedFields, localizedFields, schema, mode) {
  let localeContent = "";

  if (serializedTypes.includes(mode) && schema.fields) {
    let localeContentObject = sanitizeObject({
      ...sharedFields,
      ...localizedFields,
    });

    if (["yaml", "json", "toml"].includes(mode) && schema.list) {
      localeContentObject = localeContentObject.listWrapper;
    }

    localeContent = serialization.stringify(localeContentObject, {
      format: mode,
      delimiters: schema.delimiters,
    });
  } else {
    localeContent = localizedFields.body || "";
  }

  return localeContent;
}

/**
 * Rename locale-specific files when the main content file is renamed.
 */
const renameLocaleFiles = async (oldPath, newPath, props, repoStore) => {
  const config = repoStore.config?.document;
  if (!config || !config.i18n?.locales) return;

  const schema = getSchemaByPath(config, oldPath);
  if (!schema) return;

  const contentRoot = schema.path ? schema.path.replace(/^\/|\/$/g, "") : "";
  const relativeOldPath = stripContentRoot(contentRoot, oldPath);
  const relativeNewPath = stripContentRoot(contentRoot, newPath);

  for (const { name: locale, path: basePath } of config.i18n.locales) {
    const localeFileOldPath = `${basePath}${relativeOldPath}`;
    const localeFileNewPath = `${basePath}${relativeNewPath}`;

    try {
      const localeFileData = await github.getFile(
        props.owner,
        props.repo,
        props.branch,
        localeFileOldPath
      );
      if (localeFileData?.sha) {
        await github.renameFile(
          props.owner,
          props.repo,
          props.branch,
          localeFileOldPath,
          localeFileNewPath
        );
      }
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }
  }
};

/**
 * Delete locale-specific files when the main content file is deleted.
 */
const deleteLocaleFiles = async (filePath, props, repoStore) => {
  const config = repoStore.config?.document;
  if (!config || !config.i18n?.locales) return;

  const schema = getSchemaByPath(config, filePath);
  if (!schema) return;

  const contentRoot = schema.path ? schema.path.replace(/^\/|\/$/g, "") : "";
  const relativePath = stripContentRoot(contentRoot, filePath);

  for (const { name: locale, path: basePath } of config.i18n.locales) {
    const localeFilePath = `${basePath}${relativePath}`;

    try {
      const localeFileData = await github.getFile(
        props.owner,
        props.repo,
        props.branch,
        localeFilePath
      );
      if (localeFileData?.sha) {
        await github.deleteFile(
          props.owner,
          props.repo,
          props.branch,
          localeFilePath,
          localeFileData.sha
        );
      }
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }
  }
};

export default {
  saveLocaleFiles,
  renameLocaleFiles,
  deleteLocaleFiles,
};
