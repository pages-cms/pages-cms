import { db } from "@/db";
import { uploadChunkTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiUserSession } from "@/lib/session-server";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { CHUNK_BYTES, MAX_TOTAL_BYTES } from "@/lib/utils/upload-media";

// chunk 0 rides inline in finalize, chunks 1..MAX_CHUNK_IDX go here
const MAX_CHUNK_IDX = Math.ceil(MAX_TOTAL_BYTES / CHUNK_BYTES) - 1;

export async function POST(request: Request) {
  try {
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    const formData = await request.formData();
    const uploadId = formData.get("uploadId");
    const idxRaw = formData.get("idx");
    const chunk = formData.get("chunk");

    if (typeof uploadId !== "string" || uploadId.length === 0 || uploadId.length > 64) {
      throw createHttpError(`Invalid "uploadId".`, 400);
    }
    const idx = typeof idxRaw === "string" ? parseInt(idxRaw, 10) : NaN;
    if (!Number.isInteger(idx) || idx < 1 || idx > MAX_CHUNK_IDX) {
      throw createHttpError(`"idx" must be between 1 and ${MAX_CHUNK_IDX}.`, 400);
    }
    if (!(chunk instanceof Blob)) {
      throw createHttpError(`Invalid "chunk".`, 400);
    }
    if (chunk.size === 0 || chunk.size > CHUNK_BYTES) {
      throw createHttpError(`Chunk size must be between 1 and ${CHUNK_BYTES} bytes.`, 413);
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());

    await db.insert(uploadChunkTable).values({
      uploadId,
      userId: user.id,
      chunkIdx: idx,
      data: buffer,
    }).onConflictDoUpdate({
      target: [uploadChunkTable.uploadId, uploadChunkTable.chunkIdx],
      set: { data: buffer, createdAt: new Date() },
      setWhere: eq(uploadChunkTable.userId, user.id),
    });

    return Response.json({ status: "success" });
  } catch (error: any) {
    if (!error?.status || error.status >= 500) console.error(error);
    return toErrorResponse(error);
  }
}
