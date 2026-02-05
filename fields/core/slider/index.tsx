import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const schema = (field: Field, configObject?: Record<string, any>) => {
  let zodSchema = z.coerce.number();

  const min = (field.options?.min as number) ?? 0;
  const max = (field.options?.max as number) ?? 100;

  zodSchema = zodSchema.min(min, { message: `Minimum value is ${min}` });
  zodSchema = zodSchema.max(max, { message: `Maximum value is ${max}` });

  return z.literal("").refine(() => !field.required, { message: "This field is required" }).or(zodSchema);
};

const label = "Slider";

export { label, schema, EditComponent };
