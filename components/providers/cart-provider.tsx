'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-provider';
import { CartItem, ProductVariant, Product } from '@/types/database';

interface CartItemWithDetails extends CartItem {
  variant: ProductVariant & {
    product: Product;
  };
}

interface CartState {
  cartId: string | null;
  items: CartItemWithDetails[];
  itemCount: number;
  subtotal: number;
  loading: boolean;
}

interface CartContextType extends CartState {
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = 'sb_guest_cart';

interface StoredGuestItem { variantId: string; quantity: number }

function getGuestItems(): StoredGuestItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setGuestItems(items: StoredGuestItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<CartState>({
    cartId: null,
    items: [],
    itemCount: 0,
    subtotal: 0,
    loading: true,
  });
  const supabase = createClient();

  const calculateTotals = useCallback((items: CartItemWithDetails[]) => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => {
      const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
      return sum + price * item.quantity;
    }, 0);
    return { itemCount, subtotal };
  }, []);

  const fetchCart = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!user) {
      const storedItems = getGuestItems();
      if (!storedItems.length) {
        setState({ cartId: null, items: [], itemCount: 0, subtotal: 0, loading: false });
        return;
      }

      const { data: variants } = await supabase
        .from('product_variants')
        .select('*, product:products (*)')
        .in('id', storedItems.map((item) => item.variantId));

      const items = (variants || []).map((variant: any) => {
        const stored = storedItems.find((item) => item.variantId === variant.id)!;
        return {
          id: `local:${variant.id}`,
          cart_id: 'local',
          variant_id: variant.id,
          quantity: stored.quantity,
          created_at: new Date(0).toISOString(),
          variant: {
            ...variant,
            product: Array.isArray(variant.product) ? variant.product[0] : variant.product,
          },
        } as CartItemWithDetails;
      });
      const totals = calculateTotals(items);
      setState({ cartId: null, items, ...totals, loading: false });
      return;
    }

    const query = supabase.from('carts').select('id').eq('user_id', user.id).is('session_id', null).order('updated_at', { ascending: false }).limit(1);

    const { data: carts } = await query.maybeSingle();

    if (!carts) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        *,
        variant:product_variants (
          *,
          product:products (*)
        )
      `)
      .eq('cart_id', carts.id);

    const cartItems = (items || []).map((item: any) => ({
      ...item,
      variant: {
        ...item.variant,
        product: Array.isArray(item.variant.product) ? item.variant.product[0] : item.variant.product,
      },
    })) as CartItemWithDetails[];

    const { itemCount, subtotal } = calculateTotals(cartItems);

    setState({
      cartId: carts.id,
      items: cartItems,
      itemCount,
      subtotal,
      loading: false,
    });
  }, [user, supabase, calculateTotals]);

  // Merge guest cart into user cart on login
  const mergeGuestCart = useCallback(async () => {
    if (!user) return;

    const guestItems = getGuestItems();
    if (!guestItems.length) return;

    const { data: userCart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let cartId = userCart?.id;
    if (!cartId) {
      const { data: created } = await supabase
        .from('carts')
        .insert({ user_id: user.id, session_id: null })
        .select('id')
        .single();
      cartId = created?.id;
    }

    if (!cartId) return;

    for (const item of guestItems) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('variant_id', item.variantId)
        .maybeSingle();

      if (existing) {
        await supabase.from('cart_items').update({ quantity: existing.quantity + item.quantity }).eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({ cart_id: cartId, variant_id: item.variantId, quantity: item.quantity });
      }
    }

    localStorage.removeItem(GUEST_CART_KEY);
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      mergeGuestCart().then(() => fetchCart());
    } else {
      fetchCart();
    }
  }, [user, fetchCart, mergeGuestCart]);

  const ensureCart = async (): Promise<string> => {
    if (!user) throw new Error('A database cart requires an authenticated user');
    if (state.cartId) return state.cartId;

    const { data: newCart, error } = await supabase
      .from('carts')
      .insert({
        user_id: user?.id ?? null,
        session_id: null,
      })
      .select('id')
      .single();

    if (error || !newCart) {
      const { data: existingCart } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle();
      if (existingCart) return existingCart.id;
      throw error;
    }

    setState(prev => ({ ...prev, cartId: newCart.id }));
    return newCart.id;
  };

  const addItem = async (variantId: string, quantity: number = 1) => {
    try {
      if (!user) {
        const items = getGuestItems();
        const existing = items.find((item) => item.variantId === variantId);
        if (existing) existing.quantity += quantity;
        else items.push({ variantId, quantity });
        setGuestItems(items);
        await fetchCart();
        return;
      }

      const cartId = await ensureCart();

      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('variant_id', variantId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id: cartId,
          variant_id: variantId,
          quantity,
        });
      }

      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    if (!user && itemId.startsWith('local:')) {
      const variantId = itemId.slice('local:'.length);
      setGuestItems(getGuestItems().map((item) => item.variantId === variantId ? { ...item, quantity } : item));
      await fetchCart();
      return;
    }

    await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    await fetchCart();
  };

  const removeItem = async (itemId: string) => {
    if (!user && itemId.startsWith('local:')) {
      const variantId = itemId.slice('local:'.length);
      setGuestItems(getGuestItems().filter((item) => item.variantId !== variantId));
      await fetchCart();
      return;
    }

    await supabase.from('cart_items').delete().eq('id', itemId);
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) {
      localStorage.removeItem(GUEST_CART_KEY);
      await fetchCart();
      return;
    }

    if (state.cartId) {
      await supabase.from('cart_items').delete().eq('cart_id', state.cartId);
      await fetchCart();
    }
  };

  const refreshCart = fetchCart;

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
