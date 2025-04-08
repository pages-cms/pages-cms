"use client";;
import { Input } from "@/components/ui/input";

const EditComponent = (
  {
    ref,
    ...props
  }
) => {
  return <Input {...props} ref={ref} type="number" className="text-base" />;
};

export { EditComponent };