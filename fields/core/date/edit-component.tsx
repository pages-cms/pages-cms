"use client";;
import { Input } from "@/components/ui/input";

const EditComponent = (
  {
    ref,
    ...props
  }
) => {
  const { field, value, onChange } = props;

  return (
    <Input
      min={field?.options?.min ?? undefined}
      max={field?.options?.max ?? undefined}
      step={field?.options?.step ?? undefined}
      ref={ref}
      type={field?.options?.time ? "datetime-local" : "date"}
      value={value}
      onChange={onChange}
      className="w-auto text-base"
    />
  );
};

export { EditComponent };