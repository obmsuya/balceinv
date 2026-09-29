import { toast } from 'vue-sonner'

export interface UserRoleSummary {
  id: string
  name: string
  is_owner: boolean
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  role_id: string
  role: UserRoleSummary
  shop_ids: string[]
  locale: string | null
  is_active: boolean
  must_change_password: boolean
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

export interface UserFormValues {
  name: string
  email: string
  password?: string
  roleId: string
  shopIds?: string[]
  isActive?: boolean
}

export const useUsers = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { user: currentUser } = useAuth()

  const users = ref<ManagedUser[]>([])
  const totalUsers = ref(0)
  const loading = ref(false)
  const selectedUser = ref<ManagedUser | null>(null)

  const defaultShopIds = (): string[] => {
    const activeShopId = currentUser.value?.shop_id
    return activeShopId ? [activeShopId] : []
  }

  const fetchUsers = async (searchText = ''): Promise<void> => {
    loading.value = true
    try {
      const userPage = await apiFetch<ApiEnvelope<Page<ManagedUser>>>('/api/users', {
        query: { limit: 100, q: searchText || undefined },
      })
      users.value = userPage.data.items
      totalUsers.value = userPage.data.total
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load users')
    } finally {
      loading.value = false
    }
  }

  const fetchUser = async (userId: string): Promise<ManagedUser | undefined> => {
    loading.value = true
    try {
      const userResponse = await apiFetch<ApiEnvelope<ManagedUser>>(`/api/users/${userId}`)
      selectedUser.value = userResponse.data
      return userResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load user')
    } finally {
      loading.value = false
    }
  }

  const createUser = async (formValues: UserFormValues): Promise<ManagedUser | undefined> => {
    loading.value = true
    try {
      const createResponse = await apiFetch<ApiEnvelope<ManagedUser>>('/api/users', {
        method: 'POST',
        body: {
          name: formValues.name,
          email: formValues.email,
          password: formValues.password,
          role_id: formValues.roleId,
          shop_ids: formValues.shopIds ?? defaultShopIds(),
        },
      })
      await fetchUsers()
      toast.success(createResponse.message)
      return createResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create user')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (userId: string, formValues: UserFormValues): Promise<ManagedUser | undefined> => {
    loading.value = true
    try {
      const updateResponse = await apiFetch<ApiEnvelope<ManagedUser>>(`/api/users/${userId}`, {
        method: 'PUT',
        body: {
          name: formValues.name,
          email: formValues.email,
          role_id: formValues.roleId,
          shop_ids: formValues.shopIds,
          is_active: formValues.isActive,
        },
      })
      await fetchUsers()
      toast.success(updateResponse.message)
      return updateResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update user')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
    loading.value = true
    try {
      const passwordResponse = await apiFetch<ApiEnvelope<null>>('/api/users/update-password', {
        method: 'POST',
        body: { user_id: userId, new_password: newPassword },
      })
      toast.success(passwordResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update password')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deactivateUser = async (userId: string): Promise<void> => {
    loading.value = true
    try {
      const deactivateResponse = await apiFetch<ApiEnvelope<null>>(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      await fetchUsers()
      toast.success(deactivateResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to deactivate user')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    totalUsers,
    loading,
    selectedUser,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    updatePassword,
    deactivateUser,
    deleteUser: deactivateUser,
  }
}
