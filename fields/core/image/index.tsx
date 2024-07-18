import { ViewComponent } from "./view-component";
import { EditComponent } from "./edit-component";
import { Field } from "@/types/field";
import { swapPrefix } from "@/lib/githubImage";

const read = (value: any, field: Field, config: Record<string, any>) => {
  if (!value) return null;
  
  const prefixInput = field.options?.input ?? config.object.media?.input;
  const prefixOutput = field.options?.output ?? config.object.media?.output;

  return swapPrefix(value, prefixOutput, prefixInput, true);
};

const write = (value: any, field: Field, config: Record<string, any>) => {
  if (!value) return null;

  const prefixInput = field.options?.input ?? config.object.media?.input;
  const prefixOutput = field.options?.output ?? config.object.media?.output;

  return swapPrefix(value, prefixInput, prefixOutput);
};

const supportsList = true;

// const schema = (
//   required?: boolean,
//   pattern?: string | { regex: string; message: string },
//   options?: {
//     minlength?: number;
//     maxlength?: number;
//   }
// ) => {
//   let schema = z.string();
  
//   if (required) schema = schema.min(1, "This field is required");
//   if (pattern) {
//     if (typeof pattern === "string") {
//       schema = schema.regex(new RegExp(pattern), "Invalid format");
//     } else {
//       schema = schema.regex(new RegExp(pattern.regex), pattern.message || "Invalid format");
//     }
//   }
//   if (options?.minlength) schema = schema.min(options.minlength, `Minimum length is ${options.minlength} characters`);
//   if (options?.maxlength) schema = schema.max(options.maxlength, `Maximum length is ${options.maxlength} characters`);
  
//   return schema;
// };

export { ViewComponent, EditComponent, read, write, supportsList };