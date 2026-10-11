import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowDown, ArrowUp, ArrowUpDown, KeyRound } from 'lucide-vue-next'
import { h } from 'vue'
import { NuxtLink } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdminAuditEntry, AdminLicencePayment, AdminShopRow, AdminShopUser } from '@/composables/useAdmin'
import { adminPlanLabel } from '@/composables/useAdmin'
import { formatDate, formatDateTime, formatNumber, t } from '~/utils/i18n'

const sortableHeader = (labelKey: string, alignEnd = false) => ({ column }: any) => {
  const sortDirection = column.getIsSorted()
  const sortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown
  return h(Button, {
    variant: 'ghost',
    size: 'sm',
    class: alignEnd ? '-mr-3 ml-auto flex' : '-ml-3',
    onClick: () => column.toggleSorting(sortDirection === 'asc'),
  }, () => [t(labelKey), h(sortIcon, { class: 'ml-1 size-3.5' })])
}

const planToneClass = {
  trial: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300',
  ended: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300',
  none: 'bg-muted text-muted-foreground',
}

const timeOf = (value: string | null): number => (value ? new Date(value).getTime() : 0)

export const shopColumns: ColumnDef<AdminShopRow>[] = [
  {
    id: 'business',
    accessorFn: shop => shop.name.toLowerCase(),
    header: sortableHeader('admin.shops.business'),
    cell: ({ row }) => h('div', [
      h(NuxtLink, { to: `/admin/shops/${row.original.company_id}`, class: 'font-medium hover:underline', onClick: (event: Event) => event.stopPropagation() }, () => row.original.name),
      h('p', { class: 'text-xs text-muted-foreground' }, row.original.phone || '—'),
    ]),
  },
  {
    id: 'owner',
    accessorFn: shop => (shop.owner_name ?? '').toLowerCase(),
    header: sortableHeader('admin.shops.owner'),
    meta: { class: 'hidden md:table-cell' },
    cell: ({ row }) => h('div', [
      h('p', { class: 'text-sm' }, row.original.owner_name || '—'),
      h('p', { class: 'text-xs text-muted-foreground' }, row.original.owner_email ?? ''),
    ]),
  },
  {
    id: 'plan',
    accessorFn: shop => timeOf(shop.subscription_ends_at),
    header: sortableHeader('admin.shops.plan'),
    cell: ({ row }) => {
      const plan = adminPlanLabel(row.original)
      return h('span', { class: `inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${planToneClass[plan.tone]}` }, plan.text)
    },
  },
  {
    accessorKey: 'sales_last_30_days',
    header: sortableHeader('admin.shops.sales30', true),
    meta: { class: 'hidden text-right sm:table-cell' },
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, formatNumber(row.original.sales_last_30_days)),
  },
  {
    id: 'last_sale',
    accessorFn: shop => timeOf(shop.last_sale_at),
    header: sortableHeader('admin.shops.lastSale'),
    meta: { class: 'hidden lg:table-cell' },
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.last_sale_at ? formatDate(row.original.last_sale_at) : t('admin.shops.never')),
  },
  {
    id: 'joined',
    accessorFn: shop => timeOf(shop.created_at),
    header: sortableHeader('admin.shops.joined'),
    meta: { class: 'hidden lg:table-cell' },
    cell: ({ row }) => h('span', { class: 'text-sm' }, formatDate(row.original.created_at)),
  },
]

export const auditColumns: ColumnDef<AdminAuditEntry>[] = [
  {
    id: 'when',
    accessorFn: entry => timeOf(entry.created_at),
    header: sortableHeader('admin.audit.when'),
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatDateTime(row.original.created_at)),
  },
  {
    accessorKey: 'staff_name',
    header: sortableHeader('admin.audit.who'),
    cell: ({ row }) => h('span', { class: 'text-sm font-medium' }, row.original.staff_name),
  },
  {
    accessorKey: 'action',
    header: sortableHeader('admin.audit.action'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, t(`admin.audit.actions.${row.original.action}`)),
  },
  {
    id: 'business',
    accessorFn: entry => (entry.company_name ?? '').toLowerCase(),
    header: sortableHeader('admin.audit.business'),
    meta: { class: 'hidden md:table-cell' },
    cell: ({ row }) => row.original.company_id
      ? h(NuxtLink, { to: `/admin/shops/${row.original.company_id}`, class: 'text-sm hover:underline' }, () => row.original.company_name)
      : h('span', { class: 'text-muted-foreground' }, '—'),
  },
  {
    accessorKey: 'details',
    header: () => t('admin.audit.details'),
    meta: { class: 'hidden max-w-xs lg:table-cell' },
    cell: ({ row }) => h('span', { class: 'block truncate text-sm text-muted-foreground' }, row.original.details),
  },
]

export const licencePaymentColumns: ColumnDef<AdminLicencePayment>[] = [
  {
    id: 'date',
    accessorFn: record => timeOf(record.created_at),
    header: sortableHeader('admin.licences.paidOn'),
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatDateTime(row.original.created_at)),
  },
  {
    id: 'package',
    accessorFn: record => record.package ?? '',
    header: sortableHeader('admin.licences.plan'),
    cell: ({ row }) => h('span', { class: 'text-sm font-medium' }, row.original.package || '—'),
  },
  {
    id: 'amount',
    accessorFn: record => Number(record.amount),
    header: sortableHeader('admin.licences.amountColumn', true),
    meta: { class: 'text-right' },
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, formatNumber(Math.round(Number(row.original.amount)))),
  },
  {
    accessorKey: 'method',
    header: sortableHeader('admin.licences.method'),
    meta: { class: 'hidden sm:table-cell' },
    cell: ({ row }) => h('span', { class: 'text-sm' }, t(`admin.licences.methods.${row.original.method}`)),
  },
  {
    accessorKey: 'reference',
    header: () => t('admin.licences.referenceColumn'),
    meta: { class: 'hidden md:table-cell' },
    cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, row.original.reference || '—'),
  },
  {
    id: 'processed_by',
    accessorFn: record => record.processed_by ?? '',
    header: sortableHeader('admin.licences.recordedBy'),
    meta: { class: 'hidden lg:table-cell' },
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.processed_by || '—'),
  },
]

export const shopUserColumns = (onReset: (shopUser: AdminShopUser) => void, isBusy: () => boolean): ColumnDef<AdminShopUser>[] => [
  {
    id: 'name',
    accessorFn: shopUser => shopUser.name.toLowerCase(),
    header: sortableHeader('common.fields.name'),
    cell: ({ row }) => h('div', [
      h('p', { class: 'font-medium' }, row.original.name),
      h('p', { class: 'text-xs text-muted-foreground' }, row.original.email),
    ]),
  },
  {
    id: 'role',
    accessorFn: shopUser => (shopUser.is_owner ? '' : shopUser.role_name.toLowerCase()),
    header: sortableHeader('admin.shop.role'),
    cell: ({ row }) => h(Badge, { variant: row.original.is_owner ? 'secondary' : 'outline' }, () => (row.original.is_owner ? t('admin.shop.owner') : row.original.role_name)),
  },
  {
    id: 'status',
    header: () => t('admin.shop.status'),
    meta: { class: 'hidden sm:table-cell' },
    cell: ({ row }) => h('div', { class: 'flex flex-wrap gap-1' }, [
      !row.original.is_active && h(Badge, { variant: 'outline' }, () => t('admin.shop.inactive')),
      row.original.must_change_password && h(Badge, { variant: 'outline' }, () => t('admin.shop.mustChange')),
    ]),
  },
  {
    id: 'actions',
    header: () => '',
    meta: { class: 'text-right' },
    cell: ({ row }) => h(Button, { variant: 'outline', size: 'sm', disabled: isBusy(), onClick: () => onReset(row.original) }, () => [h(KeyRound), t('admin.shop.reset')]),
  },
]
