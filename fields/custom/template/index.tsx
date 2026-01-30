import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const schema = (field: Field) => {
  let zodSchema: z.ZodTypeAny = z.coerce.string();

  if (!field.required) zodSchema = zodSchema.optional();

  return zodSchema;
};

const label = "Template";

export { label, schema, EditComponent };
