import type { SupplierSettings } from './types';

export interface ProtectedPrice {
  sellingPrice: number;
  priceFloor: number;
  estimatedProfit: number;
  totalFixedCost: number;
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateProtectedPrice(sourceCost: number, settings: SupplierSettings): ProtectedPrice {
  if (!Number.isFinite(sourceCost) || sourceCost < 0) throw new Error('Supplier cost must be a non-negative number');

  const fixedBuffers = Number(settings.forward_shipping_buffer) + Number(settings.return_cost_buffer);
  const operationalRate = (Number(settings.payment_fee_percent) + Number(settings.tax_reserve_percent)) / 100;
  const targetRate = Number(settings.target_margin_percent) / 100;
  if (operationalRate + targetRate >= 0.95) throw new Error('Pricing percentages are too high');

  const targetMarginPrice = (sourceCost + fixedBuffers) / (1 - operationalRate - targetRate);
  const absoluteProfitFloor = (sourceCost + fixedBuffers + Number(settings.minimum_profit)) / (1 - operationalRate);
  const rawPrice = Math.max(targetMarginPrice, absoluteProfitFloor);
  const rounding = Math.max(1, Number(settings.price_rounding));
  const sellingPrice = Math.ceil(rawPrice / rounding) * rounding;
  const feesAndTax = sellingPrice * operationalRate;
  const estimatedProfit = sellingPrice - sourceCost - fixedBuffers - feesAndTax;

  return {
    sellingPrice: money(sellingPrice),
    priceFloor: money(absoluteProfitFloor),
    estimatedProfit: money(estimatedProfit),
    totalFixedCost: money(sourceCost + fixedBuffers),
  };
}

