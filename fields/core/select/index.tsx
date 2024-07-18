import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

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

  let zodSchemaSelect;

  if (field.options?.values && Array.isArray(field.options.values)) {
    const normalizedValues = field.options.values.map((item) => {
      return typeof item === "object"
        ? item.value
        : item;
    });
    zodSchemaSelect = zodSchema.pipe(z.enum(normalizedValues as [string, ...string[]]));
  }
  
  return zodSchemaSelect
    ? zodSchema.pipe(zodSchemaSelect)
    : zodSchema;
};

export { schema, EditComponent};