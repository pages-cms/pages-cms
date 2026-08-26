"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { getFileName, getParentPath, getRelativePath, joinPathSegments, normalizePath } from "@/lib/utils/file";
import { getSchemaByName } from "@/lib/schema";
import { requireApiSuccess } from "@/lib/api-client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function FileRename({
  isOpen,
  onOpenChange,
  path,
  type,
  sha,
  name,
  kind = "file",
  onRename
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
  type: "collection" | "file" | "media" | "settings";
  sha: string;
  name?: string;
  kind?: "file" | "folder";
  onRename?: (path: string, newPath: string) => void;
}) {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);
  
  if (!name) throw new Error("Name is required for FileRename");

  const schema = getSchemaByName(config.object, name, type);
  if (!schema) throw new Error(`Schema not found for ${name}.`);

  const rootPath = useMemo(() => type === "media" ? schema.input : schema.path, [type, schema.input, schema.path]);
  const normalizedPath = useMemo(() => normalizePath(path), [path]);
  const relativePath = useMemo(() => getRelativePath(normalizedPath, rootPath), [normalizedPath, rootPath]);
  const initialValue = useMemo(
    () => kind === "folder" ? getFileName(normalizedPath) : relativePath,
    [kind, normalizedPath, relativePath],
  );

  const [newRelativePath, setNewRelativePath] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setNewRelativePath(initialValue);
  }, [initialValue, isOpen]);

  const handleRename = async () => {
    try {
      const newPath = kind === "folder"
        ? normalizePath(joinPathSegments([getParentPath(normalizedPath), newRelativePath]))
        : joinPathSegments([rootPath, normalizePath(newRelativePath)]);
      const itemLabel = kind === "folder" ? "folder" : "file";
      
      const renamePromise = new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(normalizedPath)}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: (type === "collection" || type === "file") ? "content" : type,
              name,
              newPath,
              kind,
            }),
          });
          const data = await requireApiSuccess<any>(response, `Failed to rename ${itemLabel}`);

          resolve(data);
        } catch (error) {
          reject(error);
        }
      });

      toast.promise(renamePromise, {
        loading: `Renaming ${itemLabel} "${path}" to "${newPath}"`,
        success: (data: any) => {
          if (onRename) onRename(path, newPath);
          return data.message;
        },
        error: (error: any) => error.message,
      });
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {kind === "folder" ? "folder" : "file"}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Input
          value={newRelativePath}
          onChange={(e) => setNewRelativePath(e.target.value)}
        />
        <DialogFooter className="max-sm:gap-y-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="submit" onClick={handleRename} disabled={!newRelativePath.trim()}>Rename</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
