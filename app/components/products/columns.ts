import type { ColumnDef } from '@tanstack/vue-table'
import { Archive, ArchiveRestore, Eye, GitBranch, ImageOff, MoreHorizontal, Pencil, TriangleAlert } from 'lucide-vue-next'
import { h } from 'vue'
import { formatMoney } from '~/utils/money'
import { assetUrl } from '~/composables/useSettings'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Product } from '@/composables/useProducts'

export interface ProductRowActions {
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onAddVariant: (product: Product) => void
  onArchive: (product: Product) => void
  onRestore: (product: Product) => void
  canEdit: boolean
  canDelete: boolean
}

const renderThumbnail = (product: Product) => {
  const imageSource = assetUrl(product.image_url)
  const frameClass = 'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted'
  if (imageSource) {
    return h('div', { class: frameClass }, [
      h('img', { src: imageSource, alt: product.name, class: 'size-full object-cover', loading: 'lazy' }),
    ])
  }
  return h('div', { class: frameClass }, [h(ImageOff, { class: 'size-4 text-muted-foreground/50' })])
}

const renderStock = (product: Product) => {
  if (product.quantity == null) return h('span', { class: 'text-sm text-muted-foreground' }, '—')

  const isOut = product.quantity === 0
  const isLow = product.quantity <= (product.min_stock ?? 0)
  return h('div', { class: 'flex items-center gap-1.5' }, [
    isLow && h(TriangleAlert, { class: isOut ? 'size-4 text-destructive' : 'size-4 text-amber-500' }),
    h(Badge, { variant: isOut ? 'destructive' : isLow ? 'outline' : 'secondary', class: 'whitespace-nowrap tabular-nums' }, () => `${product.quantity} ${product.unit}`),
  ])
}

const renderActions = (product: Product, actions: ProductRowActions) => {
  const editItems = product.is_active && actions.canEdit
    ? [
        h(DropdownMenuItem, { onClick: () => actions.onEdit(product) }, () => [h(Pencil), 'Edit']),
        h(DropdownMenuItem, { onClick: () => actions.onAddVariant(product) }, () => [h(GitBranch), 'Add variant']),
      ]
    : []
  const archiveItem = product.is_active
    ? actions.canDelete && h(DropdownMenuItem, { class: 'text-destructive focus:text-destructive', onClick: () => actions.onArchive(product) }, () => [h(Archive), 'Archive'])
    : actions.canEdit && h(DropdownMenuItem, { onClick: () => actions.onRestore(product) }, () => [h(ArchiveRestore), 'Restore'])

  return h(DropdownMenu, null, {
    default: () => [
      h(DropdownMenuTrigger, { asChild: true }, () =>
        h(Button, { variant: 'ghost', size: 'icon', class: 'size-8' }, () => [
          h('span', { class: 'sr-only' }, 'Open menu'),
          h(MoreHorizontal),
        ]),
      ),
      h(DropdownMenuContent, { align: 'end' }, () => [
        h(DropdownMenuLabel, { class: 'max-w-56 truncate' }, () => product.name),
        h(DropdownMenuSeparator),
        h(DropdownMenuGroup, null, () => [
          h(DropdownMenuItem, { onClick: () => actions.onView(product) }, () => [h(Eye), 'View details']),
          ...editItems,
        ]),
        archiveItem && h(DropdownMenuSeparator),
        archiveItem,
      ]),
    ],
  })
}

export const createColumns = (actions: ProductRowActions): ColumnDef<Product>[] => [
  {
    id: 'image',
    header: '',
    meta: { class: 'hidden sm:table-cell' },
    cell: ({ row }) => renderThumbnail(row.original),
  },
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => {
      const product = row.original
      return h('div', { class: 'flex min-w-0 flex-col gap-0.5' }, [
        h('div', { class: 'flex flex-wrap items-center gap-x-2 gap-y-1' }, [
          h('span', { class: 'font-medium leading-tight' }, product.name),
          product.variant_count > 0 && h(Badge, { variant: 'outline', class: 'shrink-0 gap-1 font-normal' }, () => [
            h(GitBranch, { class: 'size-3' }),
            `${product.variant_count}`,
          ]),
          !product.is_active && h(Badge, { variant: 'secondary', class: 'shrink-0 font-normal' }, () => 'Archived'),
        ]),
        h('span', { class: 'font-mono text-xs text-muted-foreground' }, product.sku),
      ])
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    meta: { class: 'hidden md:table-cell' },
    cell: ({ row }) => row.original.category
      ? h(Badge, { variant: 'outline', class: 'font-normal' }, () => row.original.category)
      : h('span', { class: 'text-sm text-muted-foreground' }, '—'),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => h('span', { class: 'font-medium tabular-nums' }, formatMoney(row.original.price)),
  },
  {
    accessorKey: 'quantity',
    header: 'Stock',
    cell: ({ row }) => renderStock(row.original),
  },
  {
    id: 'actions',
    cell: ({ row }) => renderActions(row.original, actions),
  },
]
