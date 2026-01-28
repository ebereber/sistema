# Tarea: Modularizar el módulo /ventas

## Contexto

El módulo de ventas ha crecido mucho y necesita ser modularizado para mejorar la mantenibilidad. Los archivos principales son muy grandes (algunos >800 líneas).

## Estructura actual

```
app/(dashboard)/ventas/
├── [id]/
│   └── page.tsx          # Detalle de venta (~600 líneas)
├── nueva/
│   └── page.tsx          # Nueva venta (~500 líneas)
├── nueva-nc/
│   └── page.tsx          # Nueva nota de crédito
└── page.tsx              # Listado de ventas (~500 líneas)

components/ventas/
├── cart-item.tsx
├── cart-panel.tsx
├── checkout-dialog.tsx   # MUY GRANDE (~900 líneas) - PRIORIDAD
├── cancel-nc-dialog.tsx
├── discount-dialog.tsx
├── product-search.tsx
├── return-item.tsx
└── sale-filters.tsx

lib/services/
├── sales.ts              # Servicios de ventas (~400 líneas)
└── credit-note-applications.ts

lib/validations/
└── sale.ts               # Tipos y validaciones
```

## Objetivo de modularización

### 1. checkout-dialog.tsx → Dividir en:

```
components/ventas/checkout/
├── index.tsx                    # Re-export del componente principal
├── checkout-dialog.tsx          # Componente orquestador (solo estructura y estado)
├── checkout-confirmation.tsx    # Vista post-confirmación (éxito, botones imprimir/whatsapp)
├── checkout-summary.tsx         # Panel derecho (totales, NC disponibles, botón confirmar)
├── payment-methods-list.tsx     # Lista de medios de pago (efectivo, tarjeta, etc)
├── payment-split.tsx            # Vista de pago dividido
├── payment-card-form.tsx        # Formulario de tarjeta (selección tipo + lote/cupón)
├── payment-reference-form.tsx   # Formulario de referencia (transferencia)
├── credit-notes-selector.tsx    # Checkbox list de NC disponibles
├── use-checkout.ts              # Hook con estados y handlers
└── types.ts                     # Tipos específicos del checkout
```

### 2. ventas/[id]/page.tsx → Dividir en:

```
app/(dashboard)/ventas/[id]/
├── page.tsx                     # Solo layout y carga de datos
└── components/
    ├── sale-header.tsx          # Header con total, cliente, fecha
    ├── sale-voucher-card.tsx    # Card con número de comprobante y acciones
    ├── sale-products-card.tsx   # Card con lista de productos
    ├── sale-payments-card.tsx   # Card con pagos y NC aplicadas
    ├── sale-profitability-card.tsx  # Card de rentabilidad
    ├── sale-customer-card.tsx   # Card de cliente
    └── sale-notes-card.tsx      # Card de notas
```

### 3. ventas/page.tsx → Dividir en:

```
app/(dashboard)/ventas/
├── page.tsx                     # Solo layout principal
└── components/
    ├── sales-table.tsx          # Tabla desktop
    ├── sales-mobile-list.tsx    # Lista mobile
    ├── sales-row-actions.tsx    # Menú de acciones por fila (dropdown)
    └── sales-filters.tsx        # Mover desde components/ventas/
```

### 4. ventas/nueva/page.tsx → Dividir en:

```
app/(dashboard)/ventas/nueva/
├── page.tsx                     # Solo orquestador
└── components/
    ├── sale-header.tsx          # Header con cliente y ubicación
    ├── products-panel.tsx       # Panel izquierdo de productos
    └── cart-panel.tsx           # Mover y adaptar desde components/ventas/
```

## Reglas de modularización

1. **Hook `use-checkout.ts`** debe contener:
   - Todos los useState del checkout
   - Todos los handlers (handleConfirm, handlePaymentMethodClick, etc)
   - Cálculos derivados (totals, needsPayment, etc)
   - Exportar un objeto con todo lo necesario

2. **Componentes deben ser puros** cuando sea posible:
   - Recibir datos por props
   - Emitir eventos con callbacks
   - No tener lógica de negocio interna

3. **Mantener backwards compatibility**:
   - Los imports existentes deben seguir funcionando
   - Usar re-exports desde index.tsx

4. **Tipos**:
   - Crear archivos types.ts locales cuando sea necesario
   - Mantener tipos compartidos en lib/validations/sale.ts

## Prioridad de ejecución

1. **PRIMERO**: checkout-dialog.tsx (es el más grande y complejo)
2. **SEGUNDO**: ventas/[id]/page.tsx (detalle de venta)
3. **TERCERO**: ventas/page.tsx (listado)
4. **CUARTO**: ventas/nueva/page.tsx (nueva venta)

## Ejemplo de estructura del hook use-checkout.ts

```typescript
import { useState, useCallback } from 'react';
import type { CartItem, SelectedCustomer, GlobalDiscount } from '@/lib/validations/sale';
// ... otros imports

interface UseCheckoutProps {
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  total: number;
  isExchangeMode: boolean;
  exchangeData: ExchangeData | null;
  exchangeTotals: ExchangeTotals | null;
  itemsToReturn: ExchangeItem[];
  onSuccess: (saleNumber: string) => void;
}

export function useCheckout(props: UseCheckoutProps) {
  const {
    cartItems,
    customer,
    globalDiscount,
    total,
    isExchangeMode,
    exchangeData,
    exchangeTotals,
    itemsToReturn,
    onSuccess,
  } = props;

  // Estados
  const [currentView, setCurrentView] = useState<CheckoutView>('payment-list');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ... más estados

  // Handlers
  const handleConfirm = useCallback(async () => {
    // ... lógica de confirmación
  }, [/* deps */]);

  const handlePaymentMethodClick = useCallback((methodId: string) => {
    // ... lógica
  }, [/* deps */]);

  // ... más handlers

  // Cálculos derivados
  const finalAmountToPay = isExchangeMode 
    ? exchangeAmountToPay 
    : Math.max(0, total - totalSelectedCreditNotes);
  
  const needsPayment = finalAmountToPay > 0 && !isPending;

  return {
    // Estados
    currentView,
    selectedPaymentMethod,
    isPending,
    isSubmitting,
    // ... más estados
    
    // Setters necesarios
    setCurrentView,
    setSelectedPaymentMethod,
    setIsPending,
    // ... más setters
    
    // Handlers
    handleConfirm,
    handlePaymentMethodClick,
    handleBack,
    handleSplitPayment,
    // ... más handlers
    
    // Valores calculados
    finalAmountToPay,
    needsPayment,
    totalSelectedCreditNotes,
    // ... más valores
  };
}
```

## Notas importantes

- El checkout actualmente soporta:
  - Venta normal
  - Modo cambio (exchange) con items a devolver
  - Pago único o dividido
  - Pagos con tarjeta (requiere lote/cupón)
  - Pagos con transferencia (requiere referencia)
  - Aplicación de notas de crédito disponibles
  - Pendiente de pago

- No romper ninguna funcionalidad existente
- Mantener los mismos estilos y animaciones
- Los tests (si existen) deben seguir pasando

## Comando sugerido

Empezar con:
```
Primero lee todos los archivos involucrados para entender la estructura actual, luego procede con la modularización empezando por checkout-dialog.tsx
```
