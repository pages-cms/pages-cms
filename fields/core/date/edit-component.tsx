"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Server passes/receives UTC wall-clock strings (yyyy-MM-dd'T'HH:mm). Browser converts to/from local.
const toLocal = (value: string, time: boolean) => {
  if (!time) return value; 
  if (!value) return "";

  const date = new Date(`${value}Z`);
  return date.toLocaleString("sv-SE").replace(" ", "T").slice(0, 16);
};
const toUtc = (value: string, time: boolean) => {
  if (!time) return value;
  if (!value) return "";
  
  const date = new Date(value);
  return date.toISOString().slice(0, 16);
};

const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const { field, value, onChange } = props;

  return (
    <Input
      min={field?.options?.min ?? undefined}
      max={field?.options?.max ?? undefined}
      step={field?.options?.step ?? undefined}
      ref={ref}
      type={field?.options?.time ? "datetime-local" : "date"}
      value={toLocal(value, field?.options?.time)}
      onChange={(e) => onChange(toUtc(e.target.value, field?.options?.time))}
      className={cn("w-auto text-base", field?.readonly && "focus-visible:border-input focus-visible:ring-0")}
      readOnly={field?.readonly}
    />
  );
});

export { EditComponent };
