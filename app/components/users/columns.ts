import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, MoreHorizontal, Pencil, KeyRound, UserX } from 'lucide-vue-next'
import { h } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { ManagedUser } from '~/composables/useUsers'
import { formatDate, t } from '~/utils/i18n'

const sortableHeader = (labelKey: string) => ({ column }: any) =>
  h(Button, {
    variant: 'ghost',
    class: '-ml-3',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
  }, () => [t(labelKey), h(ArrowUpDown, { class: 'ml-2 size-4' })])

const dispatchUserAction = (actionName: string, user: ManagedUser) => {
  window.dispatchEvent(new CustomEvent(actionName, { detail: user }))
}

export const columns: ColumnDef<ManagedUser>[] = [
  {
    accessorKey: 'name',
    header: sortableHeader('common.fields.name'),
    cell: ({ row }) => h('div', { class: 'font-medium' }, row.original.name),
  },
  {
    accessorKey: 'email',
    header: sortableHeader('common.fields.email'),
    cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.original.email),
  },
  {
    id: 'role',
    header: () => t('common.fields.role'),
    cell: ({ row }) => {
      const role = row.original.role
      return h(Badge, { variant: role.is_owner ? 'default' : 'secondary' }, () => role.name)
    },
  },
  {
    accessorKey: 'is_active',
    header: () => t('common.fields.status'),
    cell: ({ row }) => row.original.is_active
      ? h(Badge, { variant: 'outline', class: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400' }, () => t('common.states.active'))
      : h(Badge, { variant: 'outline', class: 'text-muted-foreground' }, () => t('common.states.inactive')),
  },
  {
    accessorKey: 'created_at',
    header: () => t('users.table.added'),
    cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground tabular-nums' },
      formatDate(row.original.created_at, { year: 'numeric', month: 'short', day: 'numeric' }),
    ),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original
      const menuItems = [
        h(DropdownMenuLabel, null, () => t('common.fields.actions')),
        h(DropdownMenuSeparator),
        h(DropdownMenuItem, { onClick: () => dispatchUserAction('edit-user', user) }, () => [
          h(Pencil, { class: 'mr-2 size-4' }),
          t('common.actions.edit'),
        ]),
        h(DropdownMenuItem, { onClick: () => dispatchUserAction('update-password', user) }, () => [
          h(KeyRound, { class: 'mr-2 size-4' }),
          t('users.table.resetPassword'),
        ]),
      ]

      if (user.is_active) {
        menuItems.push(
          h(DropdownMenuSeparator),
          h(DropdownMenuItem, { class: 'text-destructive', onClick: () => dispatchUserAction('delete-user', user) }, () => [
            h(UserX, { class: 'mr-2 size-4' }),
            t('users.deactivate.action'),
          ]),
        )
      }

      return h(DropdownMenu, null, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, () =>
            h(Button, { variant: 'ghost', class: 'size-8 p-0' }, () => [
              h('span', { class: 'sr-only' }, t('users.table.openMenu')),
              h(MoreHorizontal, { class: 'size-4' }),
            ]),
          ),
          h(DropdownMenuContent, { align: 'end' }, () => menuItems),
        ],
      })
    },
  },
]
