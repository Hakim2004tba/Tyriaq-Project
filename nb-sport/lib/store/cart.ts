import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  nom: string;
  prix: number;
  image: string;
  quantite: number;
  taille?: string;
  couleur?: string;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, taille?: string, couleur?: string) => void;
  setQuantite: (productId: string, quantite: number, taille?: string, couleur?: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

const sameLine = (a: CartItem, productId: string, taille?: string, couleur?: string) =>
  a.productId === productId && a.taille === taille && a.couleur === couleur;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.taille, item.couleur));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.taille, item.couleur)
                  ? { ...i, quantite: i.quantite + item.quantite }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      remove: (productId, taille, couleur) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, taille, couleur)),
        })),
      setQuantite: (productId, quantite, taille, couleur) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, productId, taille, couleur) ? { ...i, quantite: Math.max(1, quantite) } : i
          ),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.prix * i.quantite, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantite, 0),
    }),
    { name: "nb-sport-cart" }
  )
);
