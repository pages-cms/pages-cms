"use client";;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const EditComponent = (
  {
    ref,
    ...props
  }
) => {
  const { value, field, onChange } = props;

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {field.options?.values.map((option: any) => {
          let value;
          let label;
          if (typeof option === "object") {
            value = option.value;
            label = option.label;
          } else {
            value = option;
            label = option;
          }
          return (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  )
};

export { EditComponent };