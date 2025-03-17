"use client";

import { forwardRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MediaUpload } from "@/components/media/media-upload";
import { MediaDialog } from "@/components/media/media-dialog";
import { Trash2, Upload, File, FileText, FileVideo, FileImage, FileAudio, FileArchive, FileCode, FileType, FileSpreadsheet, GripVertical, Folder, FolderOpen } from "lucide-react";
import { useConfig } from "@/contexts/config-context";
import { getFileExtension, getFileName, extensionCategories, getParentPath } from "@/lib/utils/file";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import { getSchemaByName } from "@/lib/schema";

const generateId = () => uuidv4().slice(0, 8);

const SortableItem = ({ id, file, onRemove, getFileIcon }: { 
  id: string;
  file: string;
  onRemove: (file: string) => void;
  getFileIcon: (file: string) => React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pl-2 pr-1 bg-muted rounded-md h-10">
        <div
          {...attributes} {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex items-center overflow-hidden">
          {getFileIcon(file)}
          <span className="ml-1 font-medium whitespace-nowrap">{getFileName(file)}</span>
          <span className="ml-2 text-muted-foreground truncate">{file}</span>
        </div>

        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Remove
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const { value, field, onChange } = props;
  const { config } = useConfig();

  const [files, setFiles] = useState<Array<{ id: string, path: string }>>(() => 
    value
      ? Array.isArray(value)
        ? value.map(path => ({ id: generateId(), path }))
        : [{ id: generateId(), path: value }]
      : []
  );

  const isMultiple = field.options?.multiple !== undefined && field.options?.multiple !== false;
  const mediaConfig = field.options?.media
    ? getSchemaByName(config?.object, field.options?.media, "media")
    : config?.object.media[0];
  const rootPath = field.options?.path || mediaConfig.input;
  const remainingSlots = field.options?.multiple
    ? field.options.multiple.max
      ? field.options.multiple.max - files.length
      : Infinity
    : 1 - files.length;

  useEffect(() => {
    if (isMultiple) {
      onChange(files.map(f => f.path));
    } else {
      onChange(files[0]?.path || undefined);
    }
  }, [files, isMultiple, onChange]);

  const handleUpload = useCallback((fileData: any) => {
    if (!config) return;
    
    const newFile = { id: generateId(), path: fileData.path };
    
    if (isMultiple) {
      setFiles(prev => [...prev, newFile]);
    } else {
      setFiles([newFile]);
    }
  }, [isMultiple, config]);

  const handleRemove = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const getFileIcon = (filePath: string) => {
    const ext = getFileExtension(filePath);
    for (const [category, extensions] of Object.entries(extensionCategories)) {
      if (extensions.includes(ext)) {
        switch (category) {
          case 'image':
            return <FileImage className="h-4 w-4" />;
          case 'document':
            return <FileText className="h-4 w-4" />;
          case 'video':
            return <FileVideo className="h-4 w-4" />;
          case 'audio':
            return <FileAudio className="h-4 w-4" />;
          case 'compressed':
            return <FileArchive className="h-4 w-4" />;
          case 'code':
            return <FileCode className="h-4 w-4" />;
          case 'font':
            return <FileType className="h-4 w-4" />;
          case 'spreadsheet':
            return <FileSpreadsheet className="h-4 w-4" />;
          default:
            return <FileText className="h-4 w-4" />;
        }
      }
    }
    return <File className="h-4 w-4" />;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSelected = useCallback((newPaths: string[]) => {
    if (newPaths.length === 0) {
      setFiles([]);
    } else {
      const newFiles = newPaths.map(path => ({
        id: generateId(),
        path
      }));
      
      if (isMultiple) {
        setFiles(prev => [...prev, ...newFiles]);
      } else {
        setFiles([newFiles[0]]);
      }
    }
  }, [isMultiple]);

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={files.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {files.map((file) => (
              <SortableItem 
                key={file.id}
                id={file.id}
                file={file.path}
                onRemove={() => handleRemove(file.id)}
                getFileIcon={getFileIcon}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      
      {remainingSlots > 0 && (
        <div className="flex gap-2">
          <MediaUpload path={rootPath} name={mediaConfig.name} onUpload={handleUpload}>
            <Button type="button" size="sm" variant="outline" className="gap-2">
              <Upload className="h-3.5 w-3.5"/>
              Upload
            </Button>
          </MediaUpload>      
          <TooltipProvider>
            <Tooltip>
              <MediaDialog
                name={mediaConfig.name}
                initialPath={rootPath}
                maxSelected={remainingSlots}
                onSubmit={handleSelected}
              >
                <TooltipTrigger asChild>
                  <Button type="button" size="icon-sm" variant="outline">
                    <FolderOpen className="h-3.5 w-3.5"/>
                  </Button>
                </TooltipTrigger>
              </MediaDialog>
              <TooltipContent>
                Select from media
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
});

EditComponent.displayName = "EditComponent";

export { EditComponent };