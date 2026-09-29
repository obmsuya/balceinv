<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { BarController, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import type { ReportDay } from '@/composables/useReports'
import { formatMoney } from '~/utils/money'

ChartJS.register(BarController, BarElement, CategoryScale, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip)

const props = defineProps<{ days: ReportDay[] }>()

const colorMode = useColorMode()
const themeColors = ref({ bar: '#2563eb', line: '#059669', grid: 'rgba(128,128,128,0.15)', text: '#71717a' })

const readThemeColors = () => {
  const rootStyle = getComputedStyle(document.documentElement)
  const cssValue = (name: string, fallback: string) => rootStyle.getPropertyValue(name).trim() || fallback
  themeColors.value = {
    bar: cssValue('--primary', '#2563eb'),
    line: colorMode.value === 'dark' ? '#34d399' : '#059669',
    grid: 'rgba(128,128,128,0.15)',
    text: cssValue('--muted-foreground', '#71717a'),
  }
}

onMounted(readThemeColors)
watch(() => colorMode.value, () => nextTick(readThemeColors))

const dayLabel = (isoDate: string) => new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

const chartData = computed<ChartData<'bar' | 'line'>>(() => ({
  labels: props.days.map(day => dayLabel(day.date)),
  datasets: [
    {
      type: 'bar' as const,
      label: 'Sales',
      data: props.days.map(day => day.total),
      backgroundColor: themeColors.value.bar,
      borderRadius: 4,
      maxBarThickness: 36,
      order: 2,
    },
    {
      type: 'line' as const,
      label: 'Gross profit',
      data: props.days.map(day => day.gross_profit),
      borderColor: themeColors.value.line,
      backgroundColor: themeColors.value.line,
      pointRadius: props.days.length > 31 ? 0 : 3,
      tension: 0.3,
      order: 1,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { color: themeColors.value.text, boxWidth: 12 } },
    tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatMoney(Number(context.raw))}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: themeColors.value.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
    y: { grid: { color: themeColors.value.grid }, ticks: { color: themeColors.value.text, callback: value => formatMoney(Number(value)) } },
  },
}))
</script>

<template>
  <div class="relative h-64 w-full sm:h-72">
    <Bar :data="chartData as ChartData<'bar'>" :options="chartOptions" />
  </div>
</template>
