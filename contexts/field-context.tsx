"use client";

import { Field } from "@/types/field";
import { createContext, useContext } from "react";

interface FieldContextType {
  field: Field;
}

const FieldContext = createContext<FieldContextType | undefined>(undefined);

export function useField() {
  const context = useContext(FieldContext);
  if (context === undefined) {
    throw new Error("useField must be used within a FieldProvider");
  }
  return context;
}

export function FieldProvider({
  children,
  field,
}: FieldContextType & { children: React.ReactNode }) {
  return (
    <FieldContext.Provider value={{ field }}>
      {children}
    </FieldContext.Provider>
  );
} 