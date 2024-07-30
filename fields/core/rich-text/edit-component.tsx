"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
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
  Italic,
  Link2,
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
  const editorRef = useRef<any>(null);
  const bubbleMenuRef = useRef<HTMLDivElement | null>(null);

  const [isContentReady, setContentReady] = useState(false);
  
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: { width: 2}
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
        suggestion: suggestion(() => { if (mediaDialogRef.current) mediaDialogRef.current.open() })
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
      editorRef.current = editor;
    },
    onDestroy: () => editorRef.current = null,
  });

  const handleSelectBlockType = (event: any) => {
    if (editor) {
      switch (event.target.value) {
        case "h1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;

        case "h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;

        case "h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;

        case "ul":
          editor.chain().focus().toggleBulletList().run();
          break;

        case "ol":
          editor.chain().focus().toggleOrderedList().run();
          break;

        case "code":
          editor.chain().focus().toggleCodeBlock().run();
          break;

        case "blockquote":
          editor.chain().focus().toggleBlockquote().run();
          break;

        case "p":
        default:
          editor.chain().focus().setParagraph().run();
          break;
      }
    }
  };

  const getBlockType = () => {
    if (editor) {
      if (editor.isActive("heading", { level: 1 })) {
        return "h1";
      } else if (editor.isActive("heading", { level: 2 })) {
        return "h2";
      } else if (editor.isActive("heading", { level: 3 })) {
        return "h3";
      } else if (editor.isActive("bulletList")) {
        return "ul";
      } else if (editor.isActive("orderedList")) {
        return "ol";
      } else if (editor.isActive("codeBlock")) {
        return "code";
      } else if (editor.isActive("blockquote")) {
        return "blockquote";
      }
    }
    return "p";
  }

  const handleMediaDialogSubmit = useCallback(async (images: string[]) => {
    if (config && editorRef.current) {
      const content = await Promise.all(images.map(async (image) => {
        const url = await getRawUrl(config.owner, config.repo, config.branch, image, isPrivate);
        return `<p><img src="${url}"></p>`;
      }));
      
      editorRef.current.chain().focus().insertContent(content.join('\n')).run();
    }
  }, [config, editor, isPrivate]);

  const getAlignIcon = (editor: any) => {
    if (editor.isActive({ textAlign: 'center' })) return <AlignCenter className="h-4 w-4" />;
    if (editor.isActive({ textAlign: 'right' })) return <AlignRight className="h-4 w-4" />;
    if (editor.isActive({ textAlign: 'justify' })) return <AlignJustify className="h-4 w-4" />;
    return <AlignLeft className="h-4 w-4" />;
  };
  
  return (
    <>
      <Skeleton className={cn("rounded-md h-[8.5rem]", isContentReady ? "hidden" : "")} />
      <div className={!isContentReady ? "hidden" : ""}>
        {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100, animation: "scale", maxWidth: "450px" }}>
          <div className="p-1 rounded-md bg-popover border flex gap-x-[1px] items-center focus-visible:outline-none shadow-md transition-all duration-75" ref={bubbleMenuRef}>
            <div className="relative">
              <select className="appearance-none bg-transparent h-7 pl-2 pr-6 rounded-md hover:bg-muted text-sm outline-none focus:ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2" onChange={handleSelectBlockType} value={getBlockType()}>
                <option value="p">Text</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="ul">Bulleted list</option>
                <option value="ol">Numbered list</option>
                <option value="code">Code</option>
                <option value="blockquote">Quote</option>
              </select>
              <ChevronsUpDown className="absolute w-3 h-3 right-1.5	top-[50%] translate-y-[-50%]" />
            </div>
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
                    <ChevronsUpDown className="w-3 h-3"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent portalProps={{container: bubbleMenuRef.current}}>
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
              <>
                <div className="border-l h-4 mx-[2px]"></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xxs"
                      className="gap-x-1"
                    >
                      <TableIcon className="h-4 w-4" />
                      <ChevronsUpDown className="w-3 h-3"/>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent portalProps={{container: bubbleMenuRef.current}}>
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
              </>
            }
          </div>
        </BubbleMenu>}
        <EditorContent editor={editor} />
        <MediaDialog ref={mediaDialogRef} selected={[]} onSubmit={handleMediaDialogSubmit}/>
      </div>
    </>
  )
});

export { EditComponent };