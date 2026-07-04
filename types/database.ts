export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: 'customer' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          base_price: number;
          is_active: boolean;
          avg_rating: number;
          review_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          base_price: number;
          is_active?: boolean;
          avg_rating?: number;
          review_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          base_price?: number;
          is_active?: boolean;
          avg_rating?: number;
          review_count?: number;
          created_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          color: string | null;
          size: string | null;
          price_override: number | null;
          stock_quantity: number;
          image_urls: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          color?: string | null;
          size?: string | null;
          price_override?: number | null;
          stock_quantity?: number;
          image_urls?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          color?: string | null;
          size?: string | null;
          price_override?: number | null;
          stock_quantity?: number;
          image_urls?: string[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          created_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          min_order_value: number;
          expiry_date: string | null;
          usage_limit: number | null;
          times_used: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          min_order_value?: number;
          expiry_date?: string | null;
          usage_limit?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: 'percentage' | 'flat';
          discount_value?: number;
          min_order_value?: number;
          expiry_date?: string | null;
          usage_limit?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          order_number: string;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          shipping_cost: number;
          discount_amount: number;
          total: number;
          coupon_id: string | null;
          shipping_address: Json;
          phone: string;
          payment_id: string | null;
          payment_status: 'pending' | 'success' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          order_number?: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          shipping_cost?: number;
          discount_amount?: number;
          total: number;
          coupon_id?: string | null;
          shipping_address: Json;
          phone: string;
          payment_id?: string | null;
          payment_status?: 'pending' | 'success' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          order_number?: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal?: number;
          shipping_cost?: number;
          discount_amount?: number;
          total?: number;
          coupon_id?: string | null;
          shipping_address?: Json;
          phone?: string;
          payment_id?: string | null;
          payment_status?: 'pending' | 'success' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string | null;
          product_name: string;
          variant_info: Json;
          quantity: number;
          price_at_purchase: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          variant_id?: string | null;
          product_name: string;
          variant_info: Json;
          quantity: number;
          price_at_purchase: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          variant_id?: string | null;
          product_name?: string;
          variant_info?: Json;
          quantity?: number;
          price_at_purchase?: number;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          order_id: string;
          rating: number;
          comment: string | null;
          image_urls: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          order_id: string;
          rating: number;
          comment?: string | null;
          image_urls?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          order_id?: string;
          rating?: number;
          comment?: string | null;
          image_urls?: string[];
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
export type Cart = Database['public']['Tables']['carts']['Row'];
export type CartItem = Database['public']['Tables']['cart_items']['Row'];
export type Coupon = Database['public']['Tables']['coupons']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];

// Variant info type for order items
export interface VariantInfo {
  color?: string;
  size?: string;
}

// Extended types with relations
export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
  category: Category | null;
}

export interface CartWithItems extends Cart {
  items: (CartItem & {
    variant: ProductVariant & {
      product: Product;
    };
  })[];
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}
