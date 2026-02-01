import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

const isValidUrl = (val: string): boolean => {
  if (!val) return true;
  if (val.startsWith('/')) return true;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

const schema = (field: Field) => {
  const baseSchema = field.required
    ? z.string().min(1, "This field is required")
    : z.string();

  return baseSchema.refine(isValidUrl, {
    message: "Must be a valid URL (e.g., /about or https://example.com)",
  });
};

const label = "Link";

export { label, schema, EditComponent };
