<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AccountType } from '@/composables/useMoney'
import { accountName } from '@/composables/useMoney'

const accountTypes: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

const { t } = useI18n()
const { canEdit } = usePermissions()
const { accounts, fetchAccounts, createAccount, setAccountActive, saving } = useMoney()

const showAddDialog = ref(false)
const code = ref('')
const name = ref('')
const accountType = ref<AccountType>('expense')

const canChange = computed(() => canEdit('accounting'))

const openAdd = () => {
  code.value = ''
  name.value = ''
  accountType.value = 'expense'
  showAddDialog.value = true
}

const submit = async () => {
  if (!/^\d{1,10}$/.test(code.value.trim())) {
    toast.error(t('money.accountsPanel.errors.code'))
    return
  }
  if (!name.value.trim()) {
    toast.error(t('money.accountsPanel.errors.name'))
    return
  }
  const isAdded = await createAccount({ code: code.value.trim(), name: name.value.trim(), type: accountType.value })
  if (isAdded) showAddDialog.value = false
}

onMounted(fetchAccounts)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <p class="font-semibold">{{ t('money.accountsPanel.title') }}</p>
      <Button v-if="canChange" size="sm" @click="openAdd"><Plus /> {{ t('money.accountsPanel.add') }}</Button>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-20">{{ t('money.accountsPanel.code') }}</TableHead>
            <TableHead>{{ t('money.accountsPanel.name') }}</TableHead>
            <TableHead>{{ t('money.accountsPanel.type') }}</TableHead>
            <TableHead class="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="account in accounts" :key="account.id" :class="account.is_active ? '' : 'opacity-60'">
            <TableCell class="font-mono text-xs">{{ account.code }}</TableCell>
            <TableCell>
              {{ accountName(account) }}
              <Badge v-if="!account.is_active" variant="outline" class="ml-1">{{ t('money.accountsPanel.inactive') }}</Badge>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ t(`money.accountTypes.${account.type}`) }}</TableCell>
            <TableCell class="text-right">
              <span v-if="account.is_system" class="text-xs text-muted-foreground">{{ t('money.accountsPanel.builtIn') }}</span>
              <Button v-else-if="canChange" variant="ghost" size="sm" :disabled="saving" @click="setAccountActive(account.id, !account.is_active)">
                {{ account.is_active ? t('money.accountsPanel.turnOff') : t('money.accountsPanel.turnOn') }}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog v-model:open="showAddDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('money.accountsPanel.addTitle') }}</DialogTitle>
          <DialogDescription>{{ t('money.accountsPanel.addDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <Label for="account-type">{{ t('money.accountsPanel.type') }}</Label>
            <Select v-model="accountType">
              <SelectTrigger id="account-type" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in accountTypes" :key="type" :value="type">{{ t(`money.accountTypes.${type}`) }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="account-code">{{ t('money.accountsPanel.code') }}</Label>
            <Input id="account-code" v-model="code" inputmode="numeric" maxlength="10" placeholder="6100" />
            <p class="text-xs text-muted-foreground">{{ t('money.accountsPanel.codeHelp') }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="account-name">{{ t('money.accountsPanel.name') }}</Label>
            <Input id="account-name" v-model="name" maxlength="80" />
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="showAddDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button :disabled="saving" @click="submit">{{ t('common.actions.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
