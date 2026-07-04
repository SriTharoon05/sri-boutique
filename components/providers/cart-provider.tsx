'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-provider';
import { Cart, CartItem, ProductVariant, Product } from '@/types/database';

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

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('sb_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('sb_session_id', sessionId);
  }
  return sessionId;
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

    const sessionId = getSessionId();
    let query = supabase.from('carts').select('id');

    if (user) {
      query = query.eq('user_id', user.id).is('session_id', null);
    } else {
      query = query.eq('session_id', sessionId).is('user_id', null);
    }

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

    const cartItems = (items || []).map(item => ({
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

    const sessionId = getSessionId();
    const { data: guestCart } = await supabase
      .from('carts')
      .select('id')
      .eq('session_id', sessionId)
      .is('user_id', null)
      .maybeSingle();

    if (!guestCart) return;

    const { data: userCart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get guest cart items
    const { data: guestItems } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', guestCart.id);

    if (!guestItems?.length) {
      await supabase.from('carts').delete().eq('id', guestCart.id);
      return;
    }

    if (userCart) {
      // Move items to user cart
      for (const item of guestItems) {
        await supabase.from('cart_items').upsert({
          cart_id: userCart.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        }, {
          onConflict: 'cart_id,variant_id',
        });
      }
      await supabase.from('carts').delete().eq('id', guestCart.id);
    } else {
      // Update guest cart to user cart
      await supabase
        .from('carts')
        .update({ user_id: user.id, session_id: null })
        .eq('id', guestCart.id);
    }

    sessionStorage.removeItem('sb_session_id');
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      mergeGuestCart().then(() => fetchCart());
    } else {
      fetchCart();
    }
  }, [user, fetchCart, mergeGuestCart]);

  const ensureCart = async (): Promise<string> => {
    if (state.cartId) return state.cartId;

    const sessionId = user ? null : getSessionId();

    const { data: newCart, error } = await supabase
      .from('carts')
      .insert({
        user_id: user?.id ?? null,
        session_id: sessionId,
      })
      .select('id')
      .single();

    if (error || !newCart) throw error;

    setState(prev => ({ ...prev, cartId: newCart.id }));
    return newCart.id;
  };

  const addItem = async (variantId: string, quantity: number = 1) => {
    try {
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

    await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    await fetchCart();
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('cart_items').delete().eq('id', itemId);
    await fetchCart();
  };

  const clearCart = async () => {
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
