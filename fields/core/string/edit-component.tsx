"use client";;
import { Input } from "@/components/ui/input";

const EditComponent = (
  {
    ref,
    ...props
  }
) => {
  return <Input {...props} ref={ref} className="text-base" />;
};

export { EditComponent };