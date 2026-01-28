"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ChevronRight, ListTodo } from "lucide-react";
import type { PaymentMethod } from "./types";

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
  isPending: boolean;
  onPendingChange: (checked: boolean) => void;
  onMethodClick: (methodId: string) => void;
  onSplitPayment: () => void;
}

export function PaymentMethodsList({
  paymentMethods,
  isPending,
  onPendingChange,
  onMethodClick,
  onSplitPayment,
}: PaymentMethodsListProps) {
  return (
    <>
      <CardHeader className="px-4">
        <CardDescription>Seleccioná el medio de pago</CardDescription>
        <div className="col-start-2 row-span-2 row-start-1 mr-2 flex items-center gap-2 self-start justify-self-end">
          <Checkbox
            id="fullAmountPending"
            checked={isPending}
            onCheckedChange={(checked) => onPendingChange(checked === true)}
          />
          <Label
            htmlFor="fullAmountPending"
            className="cursor-pointer text-sm leading-none"
          >
            Pendiente de pago
          </Label>
        </div>
      </CardHeader>

      <CardContent className="p-2">
        <ItemGroup role="list">
          {paymentMethods.map((method) => (
            <Item
              variant="default"
              key={method.id}
              onClick={() => onMethodClick(method.id)}
            >
              <ItemMedia variant="icon">
                <method.icon className="size-4" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{method.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-4 text-muted-foreground" />
              </ItemActions>
            </Item>
          ))}

          <Item
            className="mt-2"
            variant="outline"
            onClick={onSplitPayment}
          >
            <ItemMedia>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                <ListTodo className="size-5" />
              </div>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Dividir pago</ItemTitle>
            </ItemContent>
            <ItemActions>
              <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
                0
              </kbd>
              <ChevronRight className="size-4 text-muted-foreground" />
            </ItemActions>
          </Item>
        </ItemGroup>
      </CardContent>
    </>
  );
}
