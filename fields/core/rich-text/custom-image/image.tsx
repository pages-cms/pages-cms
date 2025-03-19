import Image from '@tiptap/extension-image'
import { NodeViewWrapper, NodeViewWrapperProps, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function ImageNode(props: NodeViewWrapperProps) {
  const { updateAttributes } = props
  const { src, alt } = props.node.attrs
  const [isOpen, setIsOpen] = useState(false);

  let className = 'image'
  if (props.selected) { className += ' ProseMirror-selectednode' }

  const handleSave = () => {
    updateAttributes({ alt: altText });
    setIsOpen(false);
  }

  return (
    <NodeViewWrapper className={className} data-drag-handle>
      <div className="relative">
        <img src={src} alt={alt} />

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button className="absolute top-2 right-2" variant="secondary" size="xs">Edit</Button>
          </PopoverTrigger>

          <PopoverContent className="sm:max-w-md">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Image</h4>
                <p className="text-sm text-muted-foreground">
                  Configure the image.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Alt Text</Label>
                  <Input
                    id="alt-text"
                    value={alt}
                    defaultValue=""
                    className="col-span-2 h-8"
                    onChange={(e) => updateAttributes({ alt: e.target.value })}
                  />
                </div>
              </div>

              <Button
                variant="secondary"
                size="xs"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </NodeViewWrapper>
  )
}

export default Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNode)
  }
})