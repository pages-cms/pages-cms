"use client";
import { parse, format, isValid } from "date-fns";
import { Field } from "@/types/field";
import { CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ViewComponent = ({
  value,
  field
}: {
  value: string | string[],
  field: Field
}) => {
  if (!value) return null;

  const firstValue = Array.isArray(value) ? value[0] : value;
  if (firstValue == null) return null;
  const extraValuesCount = Array.isArray(value) ? value.length - 1 : 0;
  const inputType = field?.options?.time ? "datetime-local" : "date";
  const outputFormat = inputType === "datetime-local"  ? "MMM d, yyyy - HH:mm" : "MMM d, yyyy";

  const formatDate = (date: string) => {
    const parsedDate = inputType === "datetime-local" 
      ? new Date(`${date}Z`) 
      : parse(date, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      console.warn(`Date for field '${field.name}' is saved in the wrong format or invalid: ${date}.`);
      return null;
    }
    return format(parsedDate, outputFormat);
  };
  
  return (
    <span className="flex items-center gap-x-1.5">
      <Badge variant="secondary">
        <CalendarIcon/>
        {formatDate(firstValue)}
      </Badge>
      {extraValuesCount > 0 && (
        <Badge variant="secondary" className="px-1">
          +{extraValuesCount}
        </Badge>
      )}
    </span>
  );
}

export { ViewComponent };
