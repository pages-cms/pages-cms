"use client";;
import { Switch } from "@/components/ui/switch";

const EditComponent = (
  {
    ref,
    ...props
  }
) => {
  return (
    <div>
      <Switch
        {...props}
        ref={ref}
        checked={props.value}
        onCheckedChange={props.onChange}
      />
    </div>
  );
};

export { EditComponent };