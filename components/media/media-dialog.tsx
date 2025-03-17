"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { MediaView } from "@/components/media/media-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSchemaByName } from "@/lib/schema";

export interface MediaDialogHandle {
  open: () => void;
  close: () => void;
}

const MediaDialog = forwardRef(({
  name,
  selected,
  onSubmit,
  maxSelected,
  initialPath,
  children
}: {
  name?: string,
  onSubmit: (images: string[]) => void,
  selected?: string[],
  maxSelected?: number,
  initialPath?: string,
  children?: React.ReactNode
}, ref) => {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const configMedia = name
    ? getSchemaByName(config.object, name, "media")
    : config.object.media[0];

  const selectedImagesRef = useRef(selected || []);
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((newSelected: string[]) => {
    selectedImagesRef.current = newSelected;
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(selectedImagesRef.current);
  }, [onSubmit]);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && 
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      }
      <DialogContent className="w-full sm:max-w-screen-xl sm:w-[calc(100vw-6rem)] h-[calc(100vh-6rem)] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>Select images</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        
        <MediaView name={configMedia.name} initialSelected={selected || []} onSelect={handleSelect} maxSelected={maxSelected} initialPath={initialPath || ""}/>
        {config.object.media?.input &&
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit" onClick={handleSubmit}>Select</Button>
            </DialogClose>
          </DialogFooter>
        }
      </DialogContent>
    </Dialog>
  );
});

MediaDialog.displayName = "MediaDialog";

export { MediaDialog };