<script setup lang="ts">
import { UserPlus } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { columns } from '@/components/users/columns';
import DataTable from '@/components/users/DataTable.vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '~/composables/useUsers';
import ShopAssignment from '@/components/users/ShopAssignment.vue';


const { users, loading, fetchUsers, createUser, updateUser, updatePassword, deactivateUser } = useUsers();
const { roles, fetchRoles } = useRoles();
const { t } = useI18n();

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showPasswordDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedUser = ref<any>(null);

const formData = ref({
  name: '',
  email: '',
  password: '',
  roleId: '',
  shopIds: [] as string[],
});

const newPassword = ref('');

const { user } = useAuth()
const assignableShops = computed(() => user.value?.shops ?? [])
const showShopAssignment = computed(() => assignableShops.value.length > 1)
onMounted(async () => {
  await fetchUsers();
  await fetchRoles();
  
  globalThis.addEventListener('edit-user', handleEdit);
  globalThis.addEventListener('update-password', handleUpdatePassword);
  globalThis.addEventListener('delete-user', handleDelete);
});

onUnmounted(() => {
  globalThis.removeEventListener('edit-user', handleEdit);
  globalThis.removeEventListener('update-password', handleUpdatePassword);
  globalThis.removeEventListener('delete-user', handleDelete);
});

const handleEdit = (event: any) => {
  selectedUser.value = event.detail;
  formData.value = {
    name: event.detail.name,
    email: event.detail.email,
    password: '',
    roleId: event.detail.role_id,
    shopIds: [...(event.detail.shop_ids ?? [])],
  };
  showEditDialog.value = true;
};

const handleUpdatePassword = (event: any) => {
  selectedUser.value = event.detail;
  newPassword.value = '';
  showPasswordDialog.value = true;
};

const handleDelete = (event: any) => {
  selectedUser.value = event.detail;
  showDeleteDialog.value = true;
};

const openCreateDialog = () => {
  formData.value = {
    name: '',
    email: '',
    password: '',
    roleId: '',
    shopIds: user.value?.shop_id ? [user.value.shop_id] : [],
  };
  showCreateDialog.value = true;
};


const handleCreateSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error(t('users.validation.nameRequired'));
    return;
  }
  
  if (!formData.value.email.trim()) {
    toast.error(t('users.validation.emailRequired'));
    return;
  }
  
  if (!formData.value.password.trim()) {
    toast.error(t('users.validation.passwordRequired'));
    return;
  }
  
  if (formData.value.password.length < 8) {
    toast.error(t('users.validation.passwordTooShort'));
    return;
  }
  
  if (!formData.value.roleId) {
    toast.error(t('users.validation.roleRequired'));
    return;
  }

  if (showShopAssignment.value && formData.value.shopIds.length === 0) {
    toast.error(t('users.validation.shopRequired'));
    return;
  }

  try {
    await createUser(formData.value);
    showCreateDialog.value = false;
  } catch (error) {
    console.error('Failed to create user:', error);
  }
};

const handleEditSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error(t('users.validation.nameRequired'));
    return;
  }
  
  if (!formData.value.email.trim()) {
    toast.error(t('users.validation.emailRequired'));
    return;
  }
  
  if (!formData.value.roleId) {
    toast.error(t('users.validation.roleRequired'));
    return;
  }

  if (showShopAssignment.value && formData.value.shopIds.length === 0) {
    toast.error(t('users.validation.shopRequired'));
    return;
  }

  try {
    await updateUser(selectedUser.value.id, {
      name: formData.value.name,
      email: formData.value.email,
      roleId: formData.value.roleId,
      shopIds: showShopAssignment.value ? formData.value.shopIds : undefined,
    });
    showEditDialog.value = false;
    selectedUser.value = null;
  } catch (error) {
    console.error('Failed to update user:', error);
  }
};

const handlePasswordSubmit = async () => {
  if (!newPassword.value.trim()) {
    toast.error(t('users.validation.passwordRequired'));
    return;
  }
  
  if (newPassword.value.length < 8) {
    toast.error(t('users.validation.passwordTooShort'));
    return;
  }

  try {
    await updatePassword(selectedUser.value.id, newPassword.value);
    showPasswordDialog.value = false;
    selectedUser.value = null;
    newPassword.value = '';
  } catch (error) {
    console.error('Failed to update password:', error);
  }
};

const confirmDelete = async () => {
  if (selectedUser.value) {
    try {
      await deactivateUser(selectedUser.value.id);
      showDeleteDialog.value = false;
      selectedUser.value = null;
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  }
};
</script>

<template>
  <div class="container mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('users.page.title') }}</h1>
        <p class="text-muted-foreground mt-1">
          {{ t('users.page.subtitle') }}
        </p>
      </div>
      <Button @click="openCreateDialog" :disabled="loading">
        <UserPlus class="mr-2 h-4 w-4" />
        {{ t('users.page.add') }}
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('users.page.listTitle') }}</CardTitle>
        <CardDescription>{{ t('users.page.listDescription') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable :columns="columns" :data="users" />
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('users.create.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('users.create.description') }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="create-name">{{ t('users.form.fullName') }}</Label>
            <Input
              id="create-name"
              v-model="formData.name"
              :placeholder="t('users.form.fullNamePlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <Label for="create-email">{{ t('common.fields.email') }}</Label>
            <Input
              id="create-email"
              v-model="formData.email"
              type="email"
              placeholder="user@example.com"
            />
          </div>
          <div class="space-y-2">
            <Label for="create-password">{{ t('common.fields.password') }}</Label>
            <Input
              id="create-password"
              v-model="formData.password"
              type="password"
              :placeholder="t('users.form.passwordPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <Label for="create-role">{{ t('common.fields.role') }}</Label>
            <Select v-model="formData.roleId">
              <SelectTrigger id="create-role">
                <SelectValue :placeholder="t('users.form.rolePlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="role in roles"
                  :key="role.id"
                  :value="role.id"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ShopAssignment v-if="showShopAssignment" v-model="formData.shopIds" :shops="assignableShops" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button @click="handleCreateSubmit" :disabled="loading">
            {{ t('users.create.submit') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('users.edit.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('users.edit.description') }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="edit-name">{{ t('users.form.fullName') }}</Label>
            <Input
              id="edit-name"
              v-model="formData.name"
              :placeholder="t('users.form.fullNamePlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <Label for="edit-email">{{ t('common.fields.email') }}</Label>
            <Input
              id="edit-email"
              v-model="formData.email"
              type="email"
              placeholder="user@example.com"
            />
          </div>
          <div class="space-y-2">
            <Label for="edit-role">{{ t('common.fields.role') }}</Label>
            <Select v-model="formData.roleId">
              <SelectTrigger id="edit-role">
                <SelectValue :placeholder="t('users.form.rolePlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="role in roles"
                  :key="role.id"
                  :value="role.id"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ShopAssignment v-if="showShopAssignment" v-model="formData.shopIds" :shops="assignableShops" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button @click="handleEditSubmit" :disabled="loading">
            {{ t('users.edit.submit') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showPasswordDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('users.password.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('users.password.description', { name: selectedUser?.name ?? '' }) }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="new-password">{{ t('users.password.newPassword') }}</Label>
            <Input
              id="new-password"
              v-model="newPassword"
              type="password"
              :placeholder="t('users.form.passwordPlaceholder')"
            />
            <p class="text-xs text-muted-foreground">
              {{ t('users.password.signOutNote') }}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showPasswordDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button @click="handlePasswordSubmit" :disabled="loading">
            {{ t('users.password.submit') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('users.deactivate.title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('users.deactivate.body', { name: selectedUser?.name ?? '' }) }}
            {{ t('users.deactivate.cannotUndo') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">{{ t('users.deactivate.action') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>