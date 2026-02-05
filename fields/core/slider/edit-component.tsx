"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const { value, onChange, field, className, ...rest } = props;

  const min = (field?.options?.min as number) ?? 0;
  const max = (field?.options?.max as number) ?? 100;
  const step = (field?.options?.step as number) ?? 1;

  const currentValue = value ?? field?.default ?? min;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(Number(e.target.value));
  };

  return (
    <div className="flex items-center gap-4">
      <input
        {...rest}
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className={cn(
          "flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer",
          "accent-primary",
          "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4",
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary",
          "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
          className
        )}
      />
      <span className="text-sm font-medium w-10 text-right tabular-nums text-muted-foreground">
        {currentValue}
      </span>
    </div>
  );
});

EditComponent.displayName = "SliderEditComponent";

export { EditComponent };
