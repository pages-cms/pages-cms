import { requireApiSuccess } from "@/lib/api-client";
import type { FileSaveData } from "@/types/api";

// 4 MB binary fits in multipart body (overhead < 1 KB); raise above 4 MB at your own risk
export const CHUNK_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

const CHUNK_CONCURRENCY = 4;

export async function uploadMediaChunked(opts: {
  file: File;
  owner: string;
  repo: string;
  branch: string;
  mediaName: string;
  targetPath: string;
  onConflict?: "error" | "rename";
}): Promise<FileSaveData> {
  const { file, owner, repo, branch, mediaName, targetPath, onConflict } = opts;

  if (file.size > MAX_TOTAL_BYTES) {
    throw new Error(`File too large. Max ${Math.floor(MAX_TOTAL_BYTES / 1024 / 1024)} MB.`);
  }

  const uploadId = crypto.randomUUID();
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const baseUrl = `/api/${owner}/${repo}/${encodeURIComponent(branch)}/media/${encodeURIComponent(mediaName)}/${encodeURIComponent(targetPath)}`;

  const uploadChunk = async (idx: number) => {
    const start = idx * CHUNK_BYTES;
    const end = Math.min(start + CHUNK_BYTES, file.size);
    const blob = file.slice(start, end);
    const form = new FormData();
    form.set("uploadId", uploadId);
    form.set("idx", String(idx));
    form.set("chunk", blob);
    const chunkResponse = await fetch(`${baseUrl}/chunk`, { method: "POST", body: form });
    await requireApiSuccess(chunkResponse, `Failed to upload chunk ${idx + 1}/${totalChunks}`);
  };

  // batched parallelism (4); switch to rolling pool if uneven chunk times matter
  for (let i = 1; i < totalChunks; i += CHUNK_CONCURRENCY) {
    const batch = [];
    for (let j = i; j < Math.min(i + CHUNK_CONCURRENCY, totalChunks); j++) {
      batch.push(uploadChunk(j));
    }
    await Promise.all(batch);
  }

  const firstBlob = file.slice(0, Math.min(CHUNK_BYTES, file.size));
  const finalizeForm = new FormData();
  finalizeForm.set("uploadId", uploadId);
  finalizeForm.set("totalChunks", String(totalChunks));
  finalizeForm.set("firstChunk", firstBlob);
  if (onConflict) finalizeForm.set("onConflict", onConflict);

  const response = await fetch(baseUrl, { method: "POST", body: finalizeForm });
  const data = await requireApiSuccess<any>(response, "Failed to upload file");
  return data.data as FileSaveData;
}
