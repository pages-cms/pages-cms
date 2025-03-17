"use client";

import { forwardRef, useCallback, useRef, useState } from "react";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { getRawUrl, relativeToRawUrls } from "@/lib/githubImage";
import { MediaDialog, MediaDialogHandle } from "@/components/media/media-dialog";
import "./edit-component.css";
import Commands from './slash-command/commands';
import suggestion from './slash-command/suggestion';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsUpDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon
} from "lucide-react";

const EditComponent = forwardRef((props: any, ref) => {
  const { config } = useConfig();
  const { isPrivate } = useRepo();

  const { value, onChange } = props;
  const mediaDialogRef = useRef<MediaDialogHandle>(null);
  const bubbleMenuRef = useRef<HTMLDivElement | null>(null);

  const [isContentReady, setContentReady] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");

  const openMediaDialog = config?.object.media?.input
    ? () => { if (mediaDialogRef.current) mediaDialogRef.current.open() }
    : undefined;

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        dropcursor: { width: 2 }
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: { default: null },
            style: { default: null },
            width: { default: null },
            height: { default: null }
          };
        }
      }).configure({ inline: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: null,
          target: null,
        }
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands…",
      }),
      Commands.configure({
        suggestion: suggestion(openMediaDialog)
      }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline
    ],
    content: "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onCreate: async ({ editor }) => {
      if (config && value) {
        const initialContent = await relativeToRawUrls(config.owner, config.repo, config.branch, value, isPrivate);
        editor.commands.setContent(initialContent || "<p></p>");
      }
      setContentReady(true);
    }
  });

  const handleMediaDialogSubmit = useCallback(async (images: string[]) => {
    if (config && editor) {
      const content = await Promise.all(images.map(async (image) => {
        const url = await getRawUrl(config.owner, config.repo, config.branch, image, isPrivate);
        return `<p><img src="${url}"></p>`;
      }));
      editor.chain().focus().insertContent(content.join('\n')).run();
    }
  }, [config, editor, isPrivate]);

  const getBlockIcon = (editor: any) => {
    if (editor.isActive("heading", { level: 1 })) return <Heading1 className="h-4 w-4" />;
    if (editor.isActive("heading", { level: 2 })) return <Heading2 className="h-4 w-4" />;
    if (editor.isActive("heading", { level: 3 })) return <Heading3 className="h-4 w-4" />;
    if (editor.isActive("bulletList")) return <List className="h-4 w-4" />;
    if (editor.isActive("orderedList")) return <ListOrdered className="h-4 w-4" />;
    if (editor.isActive("codeBlock")) return <Code className="h-4 w-4" />;
    if (editor.isActive("blockquote")) return <Quote className="h-4 w-4" />;
    return <Pilcrow className="h-4 w-4" />;
  };

  const getAlignIcon = (editor: any) => {
    if (editor.isActive({ textAlign: "center" })) return <AlignCenter className="h-4 w-4" />;
    if (editor.isActive({ textAlign: "right" })) return <AlignRight className="h-4 w-4" />;
    if (editor.isActive({ textAlign: "justify" })) return <AlignJustify className="h-4 w-4" />;
    return <AlignLeft className="h-4 w-4" />;
  };

  return (
    <>
      <Skeleton className={cn("rounded-md h-[8.5rem]", isContentReady ? "hidden" : "")} />
      <div className={!isContentReady ? "hidden" : ""}>
        {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 25, animation: "scale", maxWidth: "370px" }}>
          <div className="p-1 rounded-md bg-popover border flex gap-x-[1px] items-center focus-visible:outline-none shadow-md" ref={bubbleMenuRef}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xxs"
                  className="gap-x-1"
                >
                  {getBlockIcon(editor)}
                  <ChevronsUpDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" portalProps={{ container: bubbleMenuRef.current }}>
                <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className="gap-x-1.5">
                  <Pilcrow className="h-4 w-4" />
                  Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setNode("heading", { level: 1 }).run()} className="gap-x-1.5">
                  <Heading1 className="h-4 w-4" />
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setNode("heading", { level: 2 }).run()} className="gap-x-1.5">
                  <Heading2 className="h-4 w-4" />
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setNode("heading", { level: 3 }).run()} className="gap-x-1.5">
                  <Heading3 className="h-4 w-4" />
                  Heading 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()} className="gap-x-1.5">
                  <List className="h-4 w-4" />
                  Bulleted list
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()} className="gap-x-1.5">
                  <ListOrdered className="h-4 w-4" />
                  Numbered list
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().toggleBlockquote().run()} className="gap-x-1.5">
                  <Quote className="h-4 w-4" />
                  Quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()} className="gap-x-1.5">
                  <Code className="h-4 w-4" />
                  Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xxs"
                  className={cn("shrink-0", editor.isActive("link") ? "bg-muted" : "")}
                  onClick={() => setLinkUrl(editor.isActive("link") ? editor.getAttributes('link').href : "")}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-1">
                <div className="flex gap-x-1 items-center">
                  <Input
                    className="h-8 flex-1"
                    placeholder="e.g. http://pagescms.org"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="xxs"
                    className="shrink-0"
                    onClick={() => linkUrl
                      ? editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
                      : editor.chain().focus().extendMarkRange('link').unsetLink()
                        .run()
                    }
                  >Link</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xxs"
                    className="shrink-0"
                    onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink()
                      .run()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {(editor.isActive("paragraph") || editor.isActive("heading")) &&
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xxs"
                    className="gap-x-1"
                  >
                    {getAlignIcon(editor)}
                    <ChevronsUpDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent portalProps={{ container: bubbleMenuRef.current }}>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()} className="gap-x-1.5">
                    <AlignLeft className="h-4 w-4" />
                    Align left
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()} className="gap-x-1.5">
                    <AlignRight className="h-4 w-4" />
                    Align right
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()} className="gap-x-1.5">
                    <AlignCenter className="h-4 w-4" />
                    Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("justify").run()} className="gap-x-1.5">
                    <AlignJustify className="h-4 w-4" />
                    Justify
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("shrink-0", editor.isActive("bold") ? "bg-muted" : "")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("shrink-0", editor.isActive("italic") ? "bg-muted" : "")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn("shrink-0", editor.isActive("strike") ? "bg-muted" : "")}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("shrink-0", editor.isActive("underline") ? "bg-muted" : "")}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn("shrink-0", editor.isActive("code") ? "bg-muted" : "")}
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xxs"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              className={cn("shrink-0", editor.isActive("code") ? "bg-muted" : "")}
            >
              <RemoveFormatting className="h-4 w-4" />
            </Button>
            {editor.isActive("table") &&
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xxs"
                    className="gap-x-1"
                  >
                    <TableIcon className="h-4 w-4" />
                    <ChevronsUpDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" portalProps={{ container: bubbleMenuRef.current }}>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>Add a column</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>Add a row</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                    <span className="text-red-500">Delete column</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                    <span className="text-red-500">Delete row</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          </div>
        </BubbleMenu>}
        <EditorContent editor={editor} />
        <MediaDialog ref={mediaDialogRef} selected={[]} onSubmit={handleMediaDialogSubmit} />
      </div>
    </>
  )
});

export { EditComponent };