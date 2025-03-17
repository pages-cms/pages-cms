import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import merge from "lodash.merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mergeDeep(...objects: any[]) {
  return merge({}, ...objects);
}