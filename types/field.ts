export type Field = {
  name: string;
  label?: string | false;
  description?: string | null;
  type: string;
  default?: any;
  list?: boolean | { min?: number; max?: number; default?: any; collapsible?: boolean | { collapsed?: boolean; summary?: string } };
  collapsible?: boolean | { collapsed?: boolean; summary?: string };
  hidden?: boolean | null;
  templateEditable?: boolean | null;
  required?: boolean | null;
  pattern?: string | { regex: string; message?: string };
  options?: Record<string, unknown> | null;
  fields?: Field[];
  blocks?: Field[];
  blockKey?: string;
  // Links this field to a boolean toggle field - when false, this field is disabled
  controlledBy?: string;
  // When true, inverts the controlledBy logic - field is enabled when toggle is OFF
  controlledByInverse?: boolean;
};