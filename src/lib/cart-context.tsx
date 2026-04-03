"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CartItem = {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  imagePath: string | null;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  clearCart: () => void;
  totalQuantity: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);

function getStorageKey() {
  if (typeof window === "undefined") return "sc_cart_default";
  return `sc_cart_${window.location.hostname}`;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(), JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === newItem.productId &&
          i.variantId === newItem.variantId,
      );
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((i) =>
          i.productId === newItem.productId &&
          i.variantId === newItem.variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      } else {
        updated = [...prev, { ...newItem, quantity: 1 }];
      }
      saveCart(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      setItems((prev) => {
        const updated = prev.filter(
          (i) =>
            !(i.productId === productId && i.variantId === variantId),
        );
        saveCart(updated);
        return updated;
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      setItems((prev) => {
        let updated: CartItem[];
        if (quantity <= 0) {
          updated = prev.filter(
            (i) =>
              !(i.productId === productId && i.variantId === variantId),
          );
        } else {
          updated = prev.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i,
          );
        }
        saveCart(updated);
        return updated;
      });
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalQuantity,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
