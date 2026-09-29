<script setup lang="ts">
import { Plus, Users as UsersIcon, Shield } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { columns } from '@/components/roles/columns';
import DataTable from '@/components/roles/DataTable.vue';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/composables/usePermissions';
import type { Permission } from '~/composables/useAuth';

const { roles, loading, fetchRoles, createRole, updateRole, deleteRole } = useRoles();
const { permissions, groupByResource, fetchPermissions, fetchRolePermissions, assignPermissionsToRole } = usePermissions();
const { t } = useI18n();

const camelCaseResource = (resource: string) => resource.replace(/_(\w)/g, (_underscore, nextLetter: string) => nextLetter.toUpperCase());

const translatedOr = (key: string, fallbackText: string) => {
  const translated = t(key);
  return translated === key ? fallbackText : translated;
};

const resourceLabel = (resource: string) => translatedOr(`roles.resources.${camelCaseResource(resource)}`, resource);

const permissionLabel = (permission: Permission) =>
  translatedOr(`roles.permissions.${camelCaseResource(permission.resource)}.${permission.action}`, permission.description);

const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showUsersDialog = ref(false);
const showPermissionsDialog = ref(false);
const isEditing = ref(false);
const selectedRole = ref<any>(null);
const roleName = ref('');
const selectedPermissions = ref<string[]>([]);
const permissionsLoading = ref(false);

const allPermissionIds = computed(() => permissions.value.map((p) => p.id));

const allSelected = computed(
  () => allPermissionIds.value.length > 0 && allPermissionIds.value.every((id) => selectedPermissions.value.includes(id))
);

const toggleAll = () => {
  if (allSelected.value) {
    selectedPermissions.value = [];
  } else {
    selectedPermissions.value = [...allPermissionIds.value];
  }
};

const isResourceAllSelected = (perms: any[]) =>
  perms.every((p) => selectedPermissions.value.includes(p.id));

const toggleResource = (perms: any[]) => {
  if (isResourceAllSelected(perms)) {
    const ids = new Set(perms.map((p) => p.id));
    selectedPermissions.value = selectedPermissions.value.filter((id) => !ids.has(id));
  } else {
    const toAdd = perms.map((p) => p.id).filter((id) => !selectedPermissions.value.includes(id));
    selectedPermissions.value = [...selectedPermissions.value, ...toAdd];
  }
};

const isPermissionSelected = (id: string) => selectedPermissions.value.includes(id);

const togglePermission = (id: string) => {
  if (selectedPermissions.value.includes(id)) {
    selectedPermissions.value = selectedPermissions.value.filter((x) => x !== id);
  } else {
    selectedPermissions.value = [...selectedPermissions.value, id];
  }
};

const { user } = useAuth();

onMounted(async () => {
  await fetchRoles();
  await fetchPermissions();
  globalThis.addEventListener('edit-role', handleEdit);
  globalThis.addEventListener('delete-role', handleDelete);
  globalThis.addEventListener('view-users', handleViewUsers);
  globalThis.addEventListener('manage-permissions', handleManagePermissions);
});

onUnmounted(() => {
  globalThis.removeEventListener('edit-role', handleEdit);
  globalThis.removeEventListener('delete-role', handleDelete);
  globalThis.removeEventListener('view-users', handleViewUsers);
  globalThis.removeEventListener('manage-permissions', handleManagePermissions);
});

const handleEdit = (event: any) => {
  selectedRole.value = event.detail;
  roleName.value = event.detail.name;
  isEditing.value = true;
  showDialog.value = true;
};

const handleDelete = (event: any) => {
  selectedRole.value = event.detail;
  showDeleteDialog.value = true;
};

const { users: companyUsers, fetchUsers } = useUsers();
const roleUsers = computed(() => companyUsers.value.filter((companyUser) => companyUser.role_id === selectedRole.value?.id));

const handleViewUsers = async (event: any) => {
  selectedRole.value = event.detail;
  showUsersDialog.value = true;
  await fetchUsers();
};

const handleManagePermissions = async (event: any) => {
  selectedRole.value = event.detail;
  selectedPermissions.value = [];
  showPermissionsDialog.value = true;
  permissionsLoading.value = true;
  try {
    const rolePerms = await fetchRolePermissions(event.detail.id);
    selectedPermissions.value = rolePerms.map((permission) => permission.id);
  } finally {
    permissionsLoading.value = false;
  }
};

const openCreateDialog = () => {
  selectedRole.value = null;
  roleName.value = '';
  isEditing.value = false;
  showDialog.value = true;
};

const handleSubmit = async () => {
  if (!roleName.value.trim()) { toast.error(t('roles.validation.nameRequired')); return; }
  try {
    if (isEditing.value && selectedRole.value) {
      await updateRole(selectedRole.value.id, roleName.value);
    } else {
      await createRole(roleName.value);
    }
    showDialog.value = false;
    roleName.value = '';
  } catch (error) {
    console.error('Failed to save role:', error);
  }
};

const confirmDelete = async () => {
  if (selectedRole.value) {
    try {
      await deleteRole(selectedRole.value.id);
      showDeleteDialog.value = false;
      selectedRole.value = null;
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  }
};

const handleSavePermissions = async () => {
  if (selectedRole.value) {
    try {
      await assignPermissionsToRole(selectedRole.value.id, selectedPermissions.value);
      showPermissionsDialog.value = false;
      selectedPermissions.value = [];
      await fetchRoles();
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  }
};
</script>

<template>
  <div class="container mx-auto py-6 px-4 space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('roles.page.title') }}</h1>
        <p class="text-muted-foreground mt-1">{{ t('roles.page.subtitle') }}</p>
      </div>
      <Button @click="openCreateDialog" :disabled="loading">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('roles.page.add') }}
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('roles.page.listTitle') }}</CardTitle>
        <CardDescription>{{ t('roles.page.listDescription') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable :columns="columns" :data="roles" />
      </CardContent>
    </Card>

    <Dialog v-model:open="showDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ isEditing ? t('roles.form.editTitle') : t('roles.form.createTitle') }}</DialogTitle>
          <DialogDescription>{{ isEditing ? t('roles.form.editDescription') : t('roles.form.createDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="role-name">{{ t('roles.form.name') }}</Label>
            <Input id="role-name" v-model="roleName" :placeholder="t('roles.form.namePlaceholder')" @keyup.enter="handleSubmit" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button @click="handleSubmit" :disabled="!roleName.trim()">{{ isEditing ? t('common.actions.update') : t('common.actions.create') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('roles.delete.title') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('roles.delete.body', { name: selectedRole?.name ?? '' }) }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">{{ t('common.actions.delete') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog v-model:open="showUsersDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <UsersIcon class="h-5 w-5" />
            {{ t('roles.usersDialog.title', { name: selectedRole?.name ?? '' }) }}
          </DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <div v-if="roleUsers.length" class="space-y-2">
            <div v-for="user in roleUsers" :key="user.id" class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">{{ user.name }}</p>
                <p class="text-sm text-muted-foreground">{{ user.email }}</p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-muted-foreground">{{ t('roles.usersDialog.empty') }}</div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showPermissionsDialog">
      <DialogContent class="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Shield class="h-5 w-5" />
            {{ t('roles.permissionsDialog.title', { name: selectedRole?.name ?? '' }) }}
          </DialogTitle>
          <DialogDescription>{{ t('roles.permissionsDialog.description') }}</DialogDescription>
        </DialogHeader>

        <div v-if="permissionsLoading" class="py-12 text-center text-muted-foreground text-sm">
          {{ t('roles.permissionsDialog.loading') }}
        </div>

        <div v-else class="py-4 space-y-6">

          <div class="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/40">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="perm-select-all"
                class="perm-box"
                :checked="allSelected"
                @change="toggleAll"
              />
              <label for="perm-select-all" class="text-sm font-semibold cursor-pointer select-none">
                {{ t('roles.permissionsDialog.selectAll') }}
              </label>
            </div>
            <span class="text-xs text-muted-foreground">
              {{ t('roles.permissionsDialog.selectedCount', { selected: selectedPermissions.length, total: allPermissionIds.length }) }}
            </span>
          </div>

          <div v-for="(perms, resource) in groupByResource" :key="resource" class="space-y-3">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :id="`perm-resource-${resource}`"
                class="perm-box"
                :checked="isResourceAllSelected(perms)"
                @change="toggleResource(perms)"
              />
              <label
                :for="`perm-resource-${resource}`"
                class="text-sm font-semibold uppercase text-muted-foreground cursor-pointer select-none"
              >
                {{ resourceLabel(String(resource)) }}
              </label>
            </div>
            <Separator />
            <div class="grid grid-cols-2 gap-3 pl-6">
              <div
                v-for="permission in perms"
                :key="permission.id"
                class="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :id="`perm-${permission.id}`"
                  class="perm-box"
                  :checked="isPermissionSelected(permission.id)"
                  @change="togglePermission(permission.id)"
                />
                <label
                  :for="`perm-${permission.id}`"
                  class="text-sm font-medium cursor-pointer select-none"
                >
                  {{ permissionLabel(permission) }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showPermissionsDialog = false">{{ t('common.actions.cancel') }}</Button>
          <Button @click="handleSavePermissions" :disabled="permissionsLoading">{{ t('roles.permissionsDialog.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.perm-box {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border);
  background: var(--background);
  cursor: pointer;
  position: relative;
  transition: background 0.12s, border-color 0.12s;
  flex-shrink: 0;
}

.perm-box:checked {
  background: var(--primary);
  border-color: var(--primary);
}

.perm-box:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
</style>