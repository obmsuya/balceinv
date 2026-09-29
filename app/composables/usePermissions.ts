import { toast } from 'vue-sonner'
import type { CurrentUser, Permission } from '~/composables/useAuth'

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const usePermissions = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const permissions = useState<Permission[]>('perms:all', () => [])
  const userPermissions = useState<Permission[]>('perms:user', () => [])
  const currentUser = useState<CurrentUser | null>('auth:user')
  const loading = ref(false)

  const fetchPermissions = async (): Promise<void> => {
    if (permissions.value.length > 0) return
    loading.value = true
    try {
      const permissionResponse = await apiFetch<ApiEnvelope<Permission[]>>('/api/permissions')
      permissions.value = permissionResponse.data ?? []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load permissions')
    } finally {
      loading.value = false
    }
  }

  const fetchUserPermissions = async (userId: string): Promise<Permission[]> => {
    try {
      const permissionResponse = await apiFetch<ApiEnvelope<Permission[]>>(`/api/permissions/user/${userId}`)
      return permissionResponse.data ?? []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load user permissions')
      return []
    }
  }

  const fetchRolePermissions = async (roleId: string): Promise<Permission[]> => {
    try {
      const permissionResponse = await apiFetch<ApiEnvelope<Permission[]>>(`/api/permissions/role/${roleId}`)
      return permissionResponse.data ?? []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load role permissions')
      return []
    }
  }

  const assignPermissionsToRole = async (roleId: string, permissionIds: string[]): Promise<void> => {
    loading.value = true
    try {
      const assignResponse = await apiFetch<ApiEnvelope<null>>('/api/permissions/assign-role', {
        method: 'POST',
        body: { role_id: roleId, permission_ids: permissionIds },
      })
      toast.success(assignResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update role permissions')
      throw error
    } finally {
      loading.value = false
    }
  }

  const assignPermissionsToUser = async (userId: string, permissionIds: string[]): Promise<void> => {
    loading.value = true
    try {
      const assignResponse = await apiFetch<ApiEnvelope<null>>('/api/permissions/assign-user', {
        method: 'POST',
        body: { user_id: userId, permission_ids: permissionIds },
      })
      toast.success(assignResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update user permissions')
      throw error
    } finally {
      loading.value = false
    }
  }

  const hasPermission = (resource: string, action: string): boolean => {
    if (currentUser.value?.is_owner) return true
    return userPermissions.value.some(permission => permission.resource === resource && permission.action === action)
  }

  const canView = (resource: string): boolean => hasPermission(resource, 'view')
  const canCreate = (resource: string): boolean => hasPermission(resource, 'create')
  const canEdit = (resource: string): boolean => hasPermission(resource, 'edit')
  const canDelete = (resource: string): boolean => hasPermission(resource, 'delete')

  const groupByResource = computed(() => {
    const permissionsByResource: Record<string, Permission[]> = {}
    for (const permission of permissions.value) {
      permissionsByResource[permission.resource] ??= []
      permissionsByResource[permission.resource]!.push(permission)
    }
    return permissionsByResource
  })

  return {
    permissions,
    userPermissions,
    loading,
    groupByResource,
    fetchPermissions,
    fetchUserPermissions,
    fetchRolePermissions,
    assignPermissionsToRole,
    assignPermissionsToUser,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  }
}
