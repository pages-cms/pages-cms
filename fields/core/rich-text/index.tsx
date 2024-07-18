import { z } from "zod";
import { Field } from "@/types/field";
import { htmlSwapPrefix, rawToRelativeUrls } from "@/lib/githubImage";
import { EditComponent } from "./edit-component";
import { ViewComponent } from "./view-component";
import { marked } from "marked";
import TurndownService from "turndown";

const read = (value: any, field: Field, config: Record<string, any>) => {
  let html = field.options?.format === "html"
    ? value
    : marked(value);

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
    const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    // turndownService.addRule('styled-or-classed', {
    //   filter: (node, options)  => ((node.nodeName === 'IMG' && (node.getAttribute('width') || node.getAttribute('height'))) || node.getAttribute('style') || node.getAttribute('class')),
    //   replacement: (content, node, options) => node.outerHTML
    // });
    content = turndownService.turndown(content);
  }

  return content;
};

const schema = (field: Field) => {
  let zodSchema = z.coerce.string();
  
  if (field.required) zodSchema = zodSchema.min(1, "This field is required");
  if (field.pattern) {
    if (typeof field.pattern === "string") {
      zodSchema = zodSchema.regex(new RegExp(field.pattern), "Invalid format");
    } else {
      zodSchema = zodSchema.regex(new RegExp(field.pattern.regex), field.pattern.message || "Invalid pattern format");
    }
  }
  if (field.options?.minlength) zodSchema = zodSchema.min(field.options.minlength as number, `Minimum length is ${field.options.minlength} characters`);
  if (field.options?.maxlength) zodSchema = zodSchema.max(field.options.maxlength as number, `Maximum length is ${field.options.maxlength} characters`);
  
  return zodSchema;
};

export { EditComponent, ViewComponent, schema, read, write};