// TODO: split into separate files to improve bundling/tree-shaking?
import { Field } from "@/types/field";
import { z } from "zod";

const fieldTypes = new Set<string>();
let labels: Record<string, string> = {};
let schemas: Record<string, (field: Field, configObject?: Record<string, any>) => z.ZodTypeAny> = {};
let defaultValues: Record<string, any> = {};
let readFns: Record<string, (value: any, field: Field, configObject?: Record<string, any>) => any> = {};
let writeFns: Record<string, (value: any, field: Field, configObject?: Record<string, any>) => any> = {};
let editComponents: Record<string, React.ComponentType<any>> = {};
let viewComponents: Record<string, React.ComponentType<any>> = {};

type FieldModule = Partial<{
  label: string;
  schema: (field: Field, configObject?: Record<string, any>) => z.ZodTypeAny;
  defaultValue: any;
  read: (value: any, field: Field, configObject?: Record<string, any>) => any;
  write: (value: any, field: Field, configObject?: Record<string, any>) => any;
  EditComponent: React.ComponentType<any>;
  ViewComponent: React.ComponentType<any>;
}>;

const fieldModules = {
  ...import.meta.glob<FieldModule>("./core/**/index.{ts,tsx}", { eager: true }),
  ...import.meta.glob<FieldModule>("./custom/**/index.{ts,tsx}", { eager: true }),
};

Object.entries(fieldModules).forEach(([key, fieldModule]) => {
  const match = key.match(/\.\/(?:core|custom)\/([^/]+)\/index\.(?:ts|tsx)$/);
  const fieldName = match?.[1];

  if (!fieldName) {
    return;
  }

  fieldTypes.add(fieldName);

  if (fieldModule.label) labels[fieldName] = fieldModule.label;
  if (fieldModule.schema) schemas[fieldName] = fieldModule.schema;
  if (fieldModule.defaultValue !== undefined) defaultValues[fieldName] = fieldModule.defaultValue;
  if (fieldModule.read) readFns[fieldName] = fieldModule.read;
  if (fieldModule.write) writeFns[fieldName] = fieldModule.write;
  if (fieldModule.EditComponent) editComponents[fieldName] = fieldModule.EditComponent;
  if (fieldModule.ViewComponent) viewComponents[fieldName] = fieldModule.ViewComponent;
});

export { labels, schemas, readFns, writeFns, defaultValues, editComponents, viewComponents, fieldTypes };
