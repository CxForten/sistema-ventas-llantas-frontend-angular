export interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
    business_id: number;
    role: {id: number; slug:string; name: string} | null;
    permissions: string[];
    business?: {id: number; name:string, ruc: string | null};
}

export interface Category{
    id: number;
    name: string;
    icon: string | null;
    sort_order: number;
    active: boolean;
    products_count?: number;
}

export interface Product {
    id: number;
    sku: string;
    name: string;
    brand: string | null;
    spec: string | null;
    description: string | null;
    category_id: number | null;
    category_name: string | null;
    cost_cents?: number;
    price_cents: number;
    price_alt_cents: number;
    margin_pct: number;
    stock: number;
    min_stock: number;
    track_stock: boolean;
    is_low: boolean;
    is_out: boolean;
    iva_rate: number;
    active: boolean;
    updated_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number | null;
  sku: string;
  name: string;
  category_name: string | null;
  spec: string | null;
  brand: string | null;
  qty: number;
  unit_cost_cents?: number;
  unit_price_cents: number;
  line_discount_cents: number;
  iva_rate: number;
  iva_cents: number;
  line_total_cents: number;
}

export interface Payment {
  id: number;
  method: PaymentMethod;
  amount_cents: number;
  received_cents: number;
  change_cents: number;
  fee_cents: number;
  reference: string | null;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type DocType = 'consumidor_final' | 'factura';

export interface Sale {
  id: number;
  number: string;
  sold_at: string;
  status: 'completada' | 'anulada';
  customer_name: string;
  customer_ident: string;
  customer_email: string | null;
  doc_type: DocType;
  payment_method: PaymentMethod;
  margin_pct: number;
  total_cents: number;
  business_income_cents: number;
  gross_margin_cents?: number;
  subtotal_cents: number;
  discount_cents: number;
  card_fee_cents: number;
  iva_cents: number;
  cost_total_cents?: number;
  total_overridden: boolean;
  override_reason: string | null;
  notes: string | null;
  cash_session_id: number | null;
  user?: string;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface CashSession {
  id: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opening_cents: number;
  expected_cents: number;
  counted_cents: number | null;
  difference_cents: number | null;
  notes: string | null;
}

export interface CashSummary {
  sales_count: number;
  voided_count: number;
  opening_cents: number;
  cash_cents: number;
  card_cents: number;
  transfer_cents: number;
  expected_cents: number;
  total_cents: number;
  income_cents: number;
  margin_cents: number;
  card_fee_cents: number;
  discount_cents: number;
}

export interface StockMovement {
  id: number;
  type: 'entrada' | 'salida' | 'ajuste' | 'venta' | 'anulacion';
  qty: number;
  stock_before: number;
  stock_after: number;
  unit_cost_cents: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: number | null;

  document_date: string | null;
  document_number: string | null;

  user: string | null;
  created_at: string;
  product?: {
    id?: number;
    name?: string | null;
    sku?: string | null;
  } | null;
}

export interface DashboardTotals {
  sales_count: number;
  total_cents: number;
  income_cents: number;
  margin_cents: number;
  card_fee_cents: number;
  cost_cents: number;
  discount_cents: number;
}

export interface DashboardData {
  today: DashboardTotals;
  month: DashboardTotals;
  series: {
    date: string;
    label: string;
    total_cents: number;
    income_cents: number;
    sales_count: number;
  }[];
  low_stock: Pick<Product, 'id' | 'name' | 'sku' | 'spec' | 'stock' | 'min_stock'>[];
}

export interface Wrapped<T> { data: T; }
export interface Paginated <T> {
    data: T [];
    meta: {current_page: number; last_page: number; total: number; per_page: number};
}

