<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { SaleReceipt } from '@/composables/useSales'
import { paymentMethodLabels } from '@/composables/useSales'
import { assetUrl } from '~/composables/useSettings'

definePageMeta({ layout: false })

const receiptLabels = {
  en: { receipt: 'Receipt', cashier: 'Served by', subtotal: 'Subtotal', discounts: 'Discounts', total: 'Total', tax: 'Includes VAT', paid: 'Paid', change: 'Change', tin: 'TIN', wholesale: 'wholesale', thanks: 'Thank you for shopping with us' },
  sw: { receipt: 'Risiti', cashier: 'Umehudumiwa na', subtotal: 'Jumla ndogo', discounts: 'Punguzo', total: 'Jumla', tax: 'Inajumuisha VAT', paid: 'Umelipa', change: 'Chenji', tin: 'TIN', wholesale: 'jumla', thanks: 'Asante kwa kununua kwetu' },
}

const route = useRoute()
const { fetchReceipt } = useSales()

const receipt = ref<SaleReceipt | null>(null)
const loadError = ref('')

const labels = computed(() => receiptLabels[receipt.value?.receipt_language === 'sw' ? 'sw' : 'en'])
const paperWidth = computed(() => (receipt.value?.paper_width_millimeters === 58 ? 58 : 80))

const money = (minorUnits: number): string => {
  const sale = receipt.value?.sale
  if (!sale) return ''
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: sale.currency_code,
    minimumFractionDigits: sale.currency_decimals,
    maximumFractionDigits: sale.currency_decimals,
  }).format(minorUnits / 10 ** sale.currency_decimals)
}

const soldAt = computed(() => receipt.value ? new Date(receipt.value.sale.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')

const printNow = () => window.print()

onMounted(async () => {
  try {
    receipt.value = await fetchReceipt(String(route.params.id))
    useHead({ title: `${labels.value.receipt} ${receipt.value.sale.receipt_number}` })
    if (route.query.print === '1') {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))
      printNow()
    }
  } catch (error: any) {
    loadError.value = error?.data?.message || 'This receipt could not be loaded'
  }
})
</script>

<template>
  <div class="min-h-screen bg-muted/40 py-6 print:bg-white print:py-0">
    <div class="mx-auto mb-4 flex justify-center print:hidden">
      <Button v-if="receipt" @click="printNow"><Printer /> Print</Button>
    </div>
    <p v-if="loadError" class="text-center text-sm text-destructive">{{ loadError }}</p>
    <article
      v-else-if="receipt"
      class="receipt mx-auto bg-white p-3 font-mono text-[11px] leading-snug text-black shadow print:shadow-none"
      :style="{ width: `${paperWidth}mm` }"
    >
      <header class="flex flex-col items-center gap-0.5 text-center">
        <img v-if="receipt.company.logo_url" :src="assetUrl(receipt.company.logo_url)!" alt="" class="mb-1 max-h-14 max-w-[60%] object-contain grayscale">
        <p class="text-[13px] font-bold">{{ receipt.company.name }}</p>
        <p>{{ receipt.shop.name }}</p>
        <p v-if="receipt.shop.address || receipt.company.address">{{ receipt.shop.address || receipt.company.address }}</p>
        <p v-if="receipt.shop.phone || receipt.company.phone">{{ receipt.shop.phone || receipt.company.phone }}</p>
        <p v-if="receipt.company.tin">{{ labels.tin }}: {{ receipt.company.tin }}</p>
        <p v-if="receipt.company.receipt_header" class="mt-1 whitespace-pre-line">{{ receipt.company.receipt_header }}</p>
      </header>

      <div class="my-2 border-t border-dashed border-black" />
      <p>{{ labels.receipt }}: {{ receipt.sale.receipt_number }}</p>
      <p>{{ soldAt }}</p>
      <p>{{ labels.cashier }}: {{ receipt.sale.cashier_name }}</p>
      <div class="my-2 border-t border-dashed border-black" />

      <div v-for="(saleLine, lineIndex) in receipt.sale.items" :key="lineIndex" class="mb-1.5">
        <p class="font-bold">{{ saleLine.product_name }}<template v-if="saleLine.variant_label"> · {{ saleLine.variant_label }}</template></p>
        <div class="flex justify-between">
          <span>{{ saleLine.quantity }} × {{ money(saleLine.unit_price) }}<template v-if="saleLine.is_wholesale"> ({{ labels.wholesale }})</template></span>
          <span>{{ money(saleLine.quantity * saleLine.unit_price) }}</span>
        </div>
        <div v-for="addon in saleLine.addons" :key="addon.addon_id" class="flex justify-between pl-2">
          <span>+ {{ addon.name }} × {{ saleLine.quantity }}</span>
          <span>{{ money(addon.unit_price * saleLine.quantity) }}</span>
        </div>
        <div v-if="saleLine.discount_amount" class="flex justify-between pl-2">
          <span>{{ saleLine.discount_name }}</span>
          <span>−{{ money(saleLine.discount_amount) }}</span>
        </div>
      </div>

      <div class="my-2 border-t border-dashed border-black" />
      <div v-if="receipt.sale.discount_total" class="flex justify-between"><span>{{ labels.subtotal }}</span><span>{{ money(receipt.sale.subtotal) }}</span></div>
      <div v-if="receipt.sale.discount_total" class="flex justify-between"><span>{{ labels.discounts }}</span><span>−{{ money(receipt.sale.discount_total) }}</span></div>
      <div class="flex justify-between text-[14px] font-bold"><span>{{ labels.total }}</span><span>{{ money(receipt.sale.total) }}</span></div>
      <div v-if="receipt.show_tax && receipt.sale.tax_total" class="flex justify-between">
        <span>{{ labels.tax }} {{ (receipt.sale.tax_rate_basis_points / 100).toLocaleString() }}%</span>
        <span>{{ money(receipt.sale.tax_total) }}</span>
      </div>
      <div class="my-2 border-t border-dashed border-black" />
      <div v-for="payment in receipt.sale.payments" :key="payment.method" class="flex justify-between">
        <span>{{ labels.paid }} ({{ paymentMethodLabels[payment.method] }})</span>
        <span>{{ money(payment.amount) }}</span>
      </div>
      <div v-if="receipt.sale.change_given" class="flex justify-between font-bold"><span>{{ labels.change }}</span><span>{{ money(receipt.sale.change_given) }}</span></div>

      <div class="my-2 border-t border-dashed border-black" />
      <p class="whitespace-pre-line text-center">{{ receipt.company.receipt_footer || labels.thanks }}</p>
    </article>
  </div>
</template>

<style>
@media print {
  @page {
    margin: 0;
  }

  html,
  body {
    background: white;
  }
}
</style>
