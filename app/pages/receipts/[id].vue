<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import type { SaleReceipt } from '@/composables/useSales'
import { assetUrl } from '~/composables/useSettings'
import { apiErrorMessage, translateIn } from '~/utils/i18n'
import { intlLocaleFor, isLocale } from '~/utils/translate'

definePageMeta({ layout: false })

const route = useRoute()
const { t } = useI18n()
const { fetchReceipt } = useSales()

const fiscalWaitAttempts = 4

const receipt = ref<SaleReceipt | null>(null)
const loadError = ref('')
const verificationQr = ref('')

const receiptLanguage = computed(() => {
  const chosenLanguage = receipt.value?.receipt_language
  return isLocale(chosenLanguage) ? chosenLanguage : 'en'
})
const receiptIntlLocale = computed(() => intlLocaleFor(receiptLanguage.value))
const label = (key: string): string => translateIn(receiptLanguage.value, `receipt.${key}`)
const paperWidth = computed(() => (receipt.value?.paper_width_millimeters === 58 ? 58 : 80))

const money = (minorUnits: number): string => {
  const sale = receipt.value?.sale
  if (!sale) return ''
  return new Intl.NumberFormat(receiptIntlLocale.value, {
    style: 'currency',
    currency: sale.currency_code,
    minimumFractionDigits: sale.currency_decimals,
    maximumFractionDigits: sale.currency_decimals,
  }).format(minorUnits / 10 ** sale.currency_decimals)
}

const soldAt = computed(() => receipt.value ? new Intl.DateTimeFormat(receiptIntlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.value.sale.created_at)) : '')

const paidPayments = computed(() => receipt.value?.sale.payments.filter(payment => payment.method !== 'credit') ?? [])

const printNow = () => window.print()

const loadReceipt = async (willPrint: boolean) => {
  const saleId = String(route.params.id)
  receipt.value = await fetchReceipt(saleId)
  for (let attempt = 0; willPrint && attempt < fiscalWaitAttempts; attempt++) {
    const fiscalStatus = receipt.value.sale.fiscal?.status
    if (!fiscalStatus || fiscalStatus === 'sent' || fiscalStatus === 'failed') break
    await new Promise(resolve => setTimeout(resolve, 1000))
    receipt.value = await fetchReceipt(saleId)
  }
  const verificationUrl = receipt.value.sale.fiscal?.verification_url
  verificationQr.value = verificationUrl ? await QRCode.toDataURL(verificationUrl, { margin: 0, width: 160 }) : ''
}

onMounted(async () => {
  try {
    await loadReceipt(route.query.print === '1')
    useHead({ title: `${label('receipt')} ${receipt.value.sale.receipt_number}` })
    if (route.query.print === '1') {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))
      printNow()
    }
  } catch (error: any) {
    loadError.value = apiErrorMessage(error, 'receipt.loadFailed')
  }
})
</script>

<template>
  <div class="min-h-screen bg-muted/40 py-6 print:bg-white print:py-0">
    <div class="mx-auto mb-4 flex justify-center print:hidden">
      <Button v-if="receipt" @click="printNow"><Printer /> {{ t('common.actions.print') }}</Button>
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
        <p v-if="receipt.company.tin">{{ label('tin') }}: {{ receipt.company.tin }}</p>
        <p v-if="receipt.company.receipt_header" class="mt-1 whitespace-pre-line">{{ receipt.company.receipt_header }}</p>
      </header>

      <div class="my-2 border-t border-dashed border-black" />
      <p>{{ label('receipt') }}: {{ receipt.sale.receipt_number }}</p>
      <p>{{ soldAt }}</p>
      <p>{{ label('cashier') }}: {{ receipt.sale.cashier_name }}</p>
      <p v-if="receipt.sale.customer_name">{{ label('customer') }}: {{ receipt.sale.customer_name }}</p>
      <p v-if="receipt.sale.order_number">{{ label('order') }}: {{ receipt.sale.order_number }}</p>
      <div class="my-2 border-t border-dashed border-black" />

      <div v-for="(saleLine, lineIndex) in receipt.sale.items" :key="lineIndex" class="mb-1.5">
        <p class="font-bold">{{ saleLine.product_name }}<template v-if="saleLine.variant_label"> · {{ saleLine.variant_label }}</template></p>
        <div class="flex justify-between">
          <span>{{ saleLine.quantity }} × {{ money(saleLine.unit_price) }}<template v-if="saleLine.is_wholesale"> ({{ label('wholesale') }})</template></span>
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
      <div v-if="receipt.sale.discount_total" class="flex justify-between"><span>{{ label('subtotal') }}</span><span>{{ money(receipt.sale.subtotal) }}</span></div>
      <div v-if="receipt.sale.discount_total" class="flex justify-between"><span>{{ label('discounts') }}</span><span>−{{ money(receipt.sale.discount_total) }}</span></div>
      <div class="flex justify-between text-[14px] font-bold"><span>{{ label('total') }}</span><span>{{ money(receipt.sale.total) }}</span></div>
      <div v-if="receipt.show_tax && receipt.sale.tax_total" class="flex justify-between">
        <span>{{ label('tax') }} {{ new Intl.NumberFormat(receiptIntlLocale).format(receipt.sale.tax_rate_basis_points / 100) }}%</span>
        <span>{{ money(receipt.sale.tax_total) }}</span>
      </div>
      <div class="my-2 border-t border-dashed border-black" />
      <div v-for="payment in paidPayments" :key="payment.method" class="flex justify-between">
        <span>{{ label('paid') }} ({{ label(`paymentMethods.${payment.method}`) }})</span>
        <span>{{ money(payment.amount) }}</span>
      </div>
      <div v-if="receipt.sale.change_given" class="flex justify-between font-bold"><span>{{ label('change') }}</span><span>{{ money(receipt.sale.change_given) }}</span></div>
      <div v-if="receipt.sale.credit_amount > 0" class="flex justify-between font-bold"><span>{{ label('balanceOwed') }}</span><span>{{ money(receipt.sale.credit_amount) }}</span></div>
      <p v-if="receipt.sale.note" class="mt-2 whitespace-pre-line">{{ label('note') }}: {{ receipt.sale.note }}</p>

      <template v-if="receipt.sale.fiscal">
        <div class="my-2 border-t border-dashed border-black" />
        <div v-if="receipt.sale.fiscal.status === 'sent'" class="flex flex-col items-center gap-1 text-center">
          <p>{{ label('efd') }}</p>
          <p v-if="receipt.sale.fiscal.verification_code" class="font-bold">{{ receipt.sale.fiscal.verification_code }}</p>
          <img v-if="verificationQr" :src="verificationQr" alt="" class="mt-1 size-24">
        </div>
        <p v-else class="text-center">{{ label('efdPending') }}</p>
      </template>

      <div class="my-2 border-t border-dashed border-black" />
      <p class="whitespace-pre-line text-center">{{ receipt.company.receipt_footer || label('thanks') }}</p>
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
