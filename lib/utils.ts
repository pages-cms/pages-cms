import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mergeDeep(target: any, source: any) {
  // Create a deep copy of the target to avoid modifying the original
  const targetCopy = JSON.parse(JSON.stringify(target));

  if (targetCopy && source) {
    Object.keys(source).forEach(key => {
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!targetCopy[key]) Object.assign(targetCopy, { [key]: {} });
        targetCopy[key] = mergeDeep(targetCopy[key], source[key]);
      } else {
        Object.assign(targetCopy, { [key]: source[key] });
      }
    });
  }
  return targetCopy; // Return the modified copy instead of the original target
}