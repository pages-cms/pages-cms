import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import merge from "lodash.merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function mergeDeep(...objects: any[]) {
  return merge({}, ...objects);
}