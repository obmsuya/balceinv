import { toast } from 'vue-sonner'

export interface Role {
  id: string
  name: string
  is_owner: boolean
  user_count: number
  permission_ids: string[]
  created_at: string
  updated_at: string
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

interface Page<Item> {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export const useRoles = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const roles = ref<Role[]>([])
  const loading = ref(false)
  const selectedRole = ref<Role | null>(null)

  const fetchRoles = async (): Promise<void> => {
    loading.value = true
    try {
      const rolePage = await apiFetch<ApiEnvelope<Page<Role>>>('/api/roles', { query: { limit: 100 } })
      roles.value = rolePage.data.items
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load roles')
    } finally {
      loading.value = false
    }
  }

  const fetchRole = async (roleId: string): Promise<Role | undefined> => {
    loading.value = true
    try {
      const roleResponse = await apiFetch<ApiEnvelope<Role>>(`/api/roles/${roleId}`)
      selectedRole.value = roleResponse.data
      return roleResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load role')
    } finally {
      loading.value = false
    }
  }

  const createRole = async (roleName: string, permissionIds: string[] = []): Promise<Role | undefined> => {
    loading.value = true
    try {
      const createResponse = await apiFetch<ApiEnvelope<Role>>('/api/roles', {
        method: 'POST',
        body: { name: roleName, permission_ids: permissionIds },
      })
      await fetchRoles()
      toast.success(createResponse.message)
      return createResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create role')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateRole = async (roleId: string, roleName: string): Promise<Role | undefined> => {
    loading.value = true
    try {
      const updateResponse = await apiFetch<ApiEnvelope<Role>>(`/api/roles/${roleId}`, {
        method: 'PUT',
        body: { name: roleName },
      })
      await fetchRoles()
      toast.success(updateResponse.message)
      return updateResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update role')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteRole = async (roleId: string): Promise<void> => {
    loading.value = true
    try {
      const deleteResponse = await apiFetch<ApiEnvelope<null>>(`/api/roles/${roleId}`, { method: 'DELETE' })
      roles.value = roles.value.filter(role => role.id !== roleId)
      toast.success(deleteResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete role')
      throw error
    } finally {
      loading.value = false
    }
  }

  const assignRole = async (userId: string, roleId: string): Promise<void> => {
    loading.value = true
    try {
      const assignResponse = await apiFetch<ApiEnvelope<unknown>>('/api/roles/assign', {
        method: 'POST',
        body: { user_id: userId, role_id: roleId },
      })
      toast.success(assignResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign role')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    roles,
    loading,
    selectedRole,
    fetchRoles,
    fetchRole,
    createRole,
    updateRole,
    deleteRole,
    assignRole,
  }
}
