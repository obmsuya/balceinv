export interface PaymentTotals {
  cash: number
  card: number
  mobile: number
}

export interface ReportSummary {
  from: string
  to: string
  sale_count: number
  units_sold: number
  total: number
  tax_total: number
  discount_total: number
  net_sales: number
  cost_total: number
  gross_profit: number
  margin_basis_points: number
  average_sale: number
  payments: PaymentTotals
}

export interface ReportDay {
  date: string
  sale_count: number
  total: number
  tax_total: number
  cost_total: number
  gross_profit: number
}

export interface ReportProduct {
  product_id: string
  name: string
  variant_label: string
  sku: string
  quantity: number
  revenue: number
  net_revenue: number
  cost_total: number
  gross_profit: number
  sale_count: number
}

export interface StockTotals {
  product_count: number
  units: number
  value_at_cost: number
  value_at_price: number
  low_count: number
  out_count: number
}

export type ProductSort = 'revenue' | 'quantity' | 'profit'
