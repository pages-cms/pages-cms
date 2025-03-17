import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const schema = (field: Field) => {
  let zodSchema;
  
  if (!field.options?.creatable && !field.options?.fetch && field.options?.values && Array.isArray(field.options.values)) {
    const normalizedValues = field.options.values.map((item) => {
      return typeof item === "object"
        ? item.value
        : item;
    });
    zodSchema = z.enum(normalizedValues as [string, ...string[]]).optional();
  } else {
    zodSchema = z.coerce.string();
  }

  if (field.options?.multiple) {
    zodSchema = z.preprocess(
      (val) => {
        if (val === "" || val === null) return undefined;
        return val;
      },
      z.array(zodSchema)
    );
  }
  
  // TODO: optional array
  if (!field.required) zodSchema = zodSchema.optional();
  
  return zodSchema;
};

export { schema, EditComponent };