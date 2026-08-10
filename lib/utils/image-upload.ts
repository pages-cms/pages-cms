import { getFileExtension, getFileSize } from "@/lib/utils/file";

const MEBIBYTE = 1024 * 1024;

const MAX_IMAGE_SOURCE_BYTES = 25 * MEBIBYTE;
const SAFE_UPLOAD_BYTES = 3 * MEBIBYTE;
const TARGET_IMAGE_BYTES = Math.floor(2.75 * MEBIBYTE);
const MAX_IMAGE_DIMENSION = 2560;
const MAX_COMPRESSION_ATTEMPTS = 8;
const INITIAL_IMAGE_QUALITY = 0.82;
const MIN_IMAGE_QUALITY = 0.58;

type SupportedImageExtension = "jpg" | "jpeg" | "png" | "webp";

type PreparedImageUpload = {
  file: File;
  optimized: boolean;
  originalSize: number;
  finalSize: number;
};

type PrepareImageUploadOptions = {
  allowedExtensions?: string[];
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

const supportedImageExtensions = new Set<SupportedImageExtension>([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const normalizeExtensions = (extensions?: string[]): Set<string> | null => {
  if (!extensions?.length) return null;
  return new Set(extensions.map((extension) => extension.toLowerCase()));
};

const replaceFileExtension = (filename: string, extension: string): string => {
  const currentExtension = getFileExtension(filename);
  const basename = currentExtension
    ? filename.slice(0, -(currentExtension.length + 1))
    : filename;
  return `${basename}.${extension}`;
};

const loadImage = async (file: File): Promise<LoadedImage> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to an HTML image for browsers with partial ImageBitmap support.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The browser could not decode this image."));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

const fitWithin = (
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser could not encode this image."));
      }
    },
    type,
    quality,
  );
});

const getOutputFormat = (
  extension: SupportedImageExtension,
  allowedExtensions: Set<string> | null,
): { extension: SupportedImageExtension; type: string; lossy: boolean } => {
  if (extension === "png" && (!allowedExtensions || allowedExtensions.has("webp"))) {
    return { extension: "webp", type: "image/webp", lossy: true };
  }
  if (extension === "jpg" || extension === "jpeg") {
    return { extension, type: "image/jpeg", lossy: true };
  }
  if (extension === "webp") {
    return { extension, type: "image/webp", lossy: true };
  }
  return { extension: "png", type: "image/png", lossy: false };
};

const optimizeImage = async (
  file: File,
  extension: SupportedImageExtension,
  allowedExtensions: Set<string> | null,
): Promise<File> => {
  const loadedImage = await loadImage(file);
  const output = getOutputFormat(extension, allowedExtensions);
  const canvas = document.createElement("canvas");
  let maxDimension = Math.min(
    MAX_IMAGE_DIMENSION,
    Math.max(loadedImage.width, loadedImage.height),
  );
  let quality = INITIAL_IMAGE_QUALITY;
  let smallestBlob: Blob | null = null;

  try {
    for (let attempt = 0; attempt < MAX_COMPRESSION_ATTEMPTS; attempt += 1) {
      const dimensions = fitWithin(
        loadedImage.width,
        loadedImage.height,
        maxDimension,
      );
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("The browser could not prepare an image canvas.");

      context.drawImage(
        loadedImage.source,
        0,
        0,
        dimensions.width,
        dimensions.height,
      );

      const blob = await canvasToBlob(
        canvas,
        output.type,
        output.lossy ? quality : undefined,
      );
      smallestBlob = !smallestBlob || blob.size < smallestBlob.size
        ? blob
        : smallestBlob;

      if (blob.size <= TARGET_IMAGE_BYTES) {
        const actualExtension = blob.type === "image/webp"
          ? "webp"
          : blob.type === "image/png"
            ? "png"
            : output.extension;
        if (allowedExtensions && !allowedExtensions.has(actualExtension)) {
          throw new Error(
            `This browser encoded ${file.name} as .${actualExtension}, which is not allowed by the media configuration.`,
          );
        }
        return new File(
          [blob],
          replaceFileExtension(file.name, actualExtension),
          { type: blob.type || output.type, lastModified: file.lastModified },
        );
      }

      const estimatedScale = Math.sqrt(TARGET_IMAGE_BYTES / blob.size) * 0.92;
      const nextScale = Math.min(0.88, Math.max(0.65, estimatedScale));
      maxDimension = Math.max(640, Math.floor(maxDimension * nextScale));
      if (output.lossy) {
        quality = Math.max(MIN_IMAGE_QUALITY, quality - 0.04);
      }
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    loadedImage.cleanup();
  }

  throw new Error(
    `Could not reduce ${file.name} below ${getFileSize(TARGET_IMAGE_BYTES)}. ` +
    `The smallest result was ${getFileSize(smallestBlob?.size ?? file.size)}.`,
  );
};

const prepareImageUpload = async (
  file: File,
  options: PrepareImageUploadOptions = {},
): Promise<PreparedImageUpload> => {
  const originalSize = file.size;

  if (originalSize <= SAFE_UPLOAD_BYTES) {
    return { file, optimized: false, originalSize, finalSize: originalSize };
  }

  if (originalSize > MAX_IMAGE_SOURCE_BYTES) {
    throw new Error(
      `${file.name} is ${getFileSize(originalSize)}. ` +
      `Pages CMS can automatically optimize images up to ${getFileSize(MAX_IMAGE_SOURCE_BYTES)}.`,
    );
  }

  const extension = getFileExtension(file.name).toLowerCase();
  if (!supportedImageExtensions.has(extension as SupportedImageExtension)) {
    throw new Error(
      `${file.name} is too large to upload safely (${getFileSize(originalSize)}). ` +
      `Automatic optimization supports JPG, PNG, and WebP; reduce other files below ${getFileSize(SAFE_UPLOAD_BYTES)} before uploading.`,
    );
  }

  const allowedExtensions = normalizeExtensions(options.allowedExtensions);
  const optimizedFile = await optimizeImage(
    file,
    extension as SupportedImageExtension,
    allowedExtensions,
  );

  return {
    file: optimizedFile,
    optimized: true,
    originalSize,
    finalSize: optimizedFile.size,
  };
};

export { prepareImageUpload };
