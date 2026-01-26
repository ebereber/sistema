"use client";

import { Input } from "@/components/ui/input";
import { forwardRef } from "react";
import {
  NumberFormatValues,
  NumericFormat,
  NumericFormatProps,
} from "react-number-format";

// Usamos Omit para quitar tanto 'customInput' como 'onValueChange' de las props originales
interface CurrencyInputProps extends Omit<
  NumericFormatProps,
  "customInput" | "onValueChange"
> {
  // Ahora podemos definir nuestra propia versión de onValueChange sin conflictos
  onValueChange?: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ onValueChange, ...props }, ref) => {
    return (
      <NumericFormat
        {...props}
        getInputRef={ref}
        customInput={Input}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={0}
        //fixedDecimalScale
        prefix="$ "
        allowNegative={false}
        // 'values' es de tipo NumberFormatValues (proviene de la librería)
        onValueChange={(values: NumberFormatValues) => {
          if (onValueChange) {
            // Extraemos el valor numérico (floatValue) y se lo pasamos a tu prop
            onValueChange(values.floatValue || 0);
          }
        }}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
