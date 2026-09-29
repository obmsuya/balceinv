import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Users, Shield, Crown } from 'lucide-vue-next'
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
import type { Role } from '~/composables/useRoles'
import { t } from '~/utils/i18n'

const dispatchRoleAction = (actionName: string, role: Role) => {
  window.dispatchEvent(new CustomEvent(actionName, { detail: role }))
}

export const columns: ColumnDef<Role>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => h(Button, {
      variant: 'ghost',
      class: '-ml-3',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
    }, () => [t('common.fields.role'), h(ArrowUpDown, { class: 'ml-2 size-4' })]),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2 font-medium' }, [
      row.original.is_owner ? h(Crown, { class: 'size-4 text-primary' }) : null,
      row.original.name,
    ]),
  },
  {
    accessorKey: 'user_count',
    header: () => t('roles.table.users'),
    cell: ({ row }) => {
      const userCount = row.original.user_count
      return h(Badge, { variant: 'secondary', class: 'whitespace-nowrap tabular-nums' }, () => t('roles.table.userCount', { count: userCount }))
    },
  },
  {
    id: 'permissions',
    header: () => t('roles.table.permissions'),
    cell: ({ row }) => row.original.is_owner
      ? h(Badge, { variant: 'default' }, () => t('common.states.all'))
      : h('span', { class: 'text-sm text-muted-foreground tabular-nums' }, t('roles.table.granted', { count: row.original.permission_ids.length })),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const role = row.original
      const menuItems = [
        h(DropdownMenuLabel, null, () => t('common.fields.actions')),
        h(DropdownMenuSeparator),
      ]

      if (!role.is_owner) {
        menuItems.push(
          h(DropdownMenuItem, { onClick: () => dispatchRoleAction('edit-role', role) }, () => [
            h(Pencil, { class: 'mr-2 size-4' }),
            t('roles.table.rename'),
          ]),
          h(DropdownMenuItem, { onClick: () => dispatchRoleAction('manage-permissions', role) }, () => [
            h(Shield, { class: 'mr-2 size-4' }),
            t('roles.table.managePermissions'),
          ]),
        )
      }

      menuItems.push(
        h(DropdownMenuItem, { onClick: () => dispatchRoleAction('view-users', role) }, () => [
          h(Users, { class: 'mr-2 size-4' }),
          t('roles.table.viewUsers'),
        ]),
      )

      if (!role.is_owner) {
        menuItems.push(
          h(DropdownMenuSeparator),
          h(DropdownMenuItem, { class: 'text-destructive', onClick: () => dispatchRoleAction('delete-role', role) }, () => [
            h(Trash2, { class: 'mr-2 size-4' }),
            t('common.actions.delete'),
          ]),
        )
      }

      return h(DropdownMenu, null, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, () =>
            h(Button, { variant: 'ghost', class: 'size-8 p-0' }, () => [
              h('span', { class: 'sr-only' }, t('roles.table.openMenu')),
              h(MoreHorizontal, { class: 'size-4' }),
            ]),
          ),
          h(DropdownMenuContent, { align: 'end' }, () => menuItems),
        ],
      })
    },
  },
]
