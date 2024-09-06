import { Field } from "@/types/field";
import { htmlSwapPrefix, rawToRelativeUrls } from "@/lib/githubImage";
import { EditComponent } from "./edit-component";
import { ViewComponent } from "./view-component";
import { marked } from "marked";
import TurndownService from "turndown";

const read = (value: any, field: Field, config: Record<string, any>) => {
  let html = field.options?.format === "html"
    ? value
    : value
      ? marked(value)
      : value;

  const prefixInput = field.options?.input ?? config.object.media?.input;
  const prefixOutput = field.options?.output ?? config.object.media?.output;
  
  return htmlSwapPrefix(html, prefixOutput, prefixInput, true);
};

const write = (value: any, field: Field, config: Record<string, any>) => {
  let content = value;
  
  content = rawToRelativeUrls(config.owner, config.repo, config.branch, content);
  
  const prefixInput = field.options?.input ?? config.object.media?.input;
  const prefixOutput = field.options?.output ?? config.object.media?.output;

  content = htmlSwapPrefix(content, prefixInput, prefixOutput);

  if (field.options?.format !== "html") {
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced"
    });
    turndownService.addRule("retain-html", {
      filter: (node: any, options: any)  => ((node.nodeName === 'IMG' && (node.getAttribute('width') || node.getAttribute('height'))) || node.getAttribute('style') || node.getAttribute('class')),
      replacement: (content: string, node: any, options: any) => node.outerHTML
    });
    content = turndownService.turndown(content);
  }

  return content;
};

export { EditComponent, ViewComponent, read, write};