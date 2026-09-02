import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const directionContainerNodes = new Set(["blockquote", "listItem", "table", "tableCell", "tableHeader"]);
const directionTextNodes = new Set(["heading", "paragraph"]);
const rtlCharacterPattern = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e800}-\u{1eeff}]/u;
const letterPattern = /\p{Letter}/u;

const getTextDirection = (text: string): "ltr" | "rtl" => {
  for (const character of text) {
    if (rtlCharacterPattern.test(character)) return "rtl";
    if (letterPattern.test(character)) return "ltr";
  }

  return "ltr";
};

/**
 * Applies bidirectional text detection to each semantic editor block.
 *
 * The extension uses ProseMirror decorations instead of document attributes.
 * Direction is therefore a presentation detail and is not written to Markdown
 * or HTML output.
 *
 * Every semantic node receives an explicit direction based on its first strong
 * character. This keeps live content updates reliable and lets nested
 * paragraphs resolve independently from markers, quote borders, and table-cell
 * alignment. Code blocks remain left-to-right because source code is
 * conventionally displayed that way.
 */
export const AutomaticTextDirection = Extension.create({
  name: "automaticTextDirection",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("automaticTextDirection"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, position) => {
              const nodeType = node.type.name;

              if (nodeType === "codeBlock") {
                decorations.push(Decoration.node(position, position + node.nodeSize, { dir: "ltr" }));
                return;
              }

              if (directionContainerNodes.has(nodeType) || directionTextNodes.has(nodeType)) {
                decorations.push(
                  Decoration.node(position, position + node.nodeSize, { dir: getTextDirection(node.textContent) }),
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
