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
    }, () => ['Role', h(ArrowUpDown, { class: 'ml-2 size-4' })]),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2 font-medium' }, [
      row.original.is_owner ? h(Crown, { class: 'size-4 text-primary' }) : null,
      row.original.name,
    ]),
  },
  {
    accessorKey: 'user_count',
    header: 'Users',
    cell: ({ row }) => {
      const userCount = row.original.user_count
      return h(Badge, { variant: 'secondary', class: 'whitespace-nowrap tabular-nums' }, () => `${userCount} user${userCount === 1 ? '' : 's'}`)
    },
  },
  {
    id: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => row.original.is_owner
      ? h(Badge, { variant: 'default' }, () => 'All')
      : h('span', { class: 'text-sm text-muted-foreground tabular-nums' }, `${row.original.permission_ids.length} granted`),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const role = row.original
      const menuItems = [
        h(DropdownMenuLabel, null, () => 'Actions'),
        h(DropdownMenuSeparator),
      ]

      if (!role.is_owner) {
        menuItems.push(
          h(DropdownMenuItem, { onClick: () => dispatchRoleAction('edit-role', role) }, () => [
            h(Pencil, { class: 'mr-2 size-4' }),
            'Rename',
          ]),
          h(DropdownMenuItem, { onClick: () => dispatchRoleAction('manage-permissions', role) }, () => [
            h(Shield, { class: 'mr-2 size-4' }),
            'Manage permissions',
          ]),
        )
      }

      menuItems.push(
        h(DropdownMenuItem, { onClick: () => dispatchRoleAction('view-users', role) }, () => [
          h(Users, { class: 'mr-2 size-4' }),
          'View users',
        ]),
      )

      if (!role.is_owner) {
        menuItems.push(
          h(DropdownMenuSeparator),
          h(DropdownMenuItem, { class: 'text-destructive', onClick: () => dispatchRoleAction('delete-role', role) }, () => [
            h(Trash2, { class: 'mr-2 size-4' }),
            'Delete',
          ]),
        )
      }

      return h(DropdownMenu, null, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, () =>
            h(Button, { variant: 'ghost', class: 'size-8 p-0' }, () => [
              h('span', { class: 'sr-only' }, 'Open menu'),
              h(MoreHorizontal, { class: 'size-4' }),
            ]),
          ),
          h(DropdownMenuContent, { align: 'end' }, () => menuItems),
        ],
      })
    },
  },
]
