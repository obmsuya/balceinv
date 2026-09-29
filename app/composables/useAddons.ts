import { toast } from 'vue-sonner'

export interface ProductAddon {
  id: string
  product_id: string
  name: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AddonFields {
  name: string
  price: number
  is_active?: boolean
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const useAddons = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const addons = ref<ProductAddon[]>([])
  const loading = ref(false)

  const fetchAddons = async (productId: string): Promise<void> => {
    loading.value = true
    try {
      const addonResponse = await apiFetch<ApiEnvelope<ProductAddon[]>>(`/api/products/${productId}/addons`)
      addons.value = addonResponse.data ?? []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load add-ons')
    } finally {
      loading.value = false
    }
  }

  const createAddon = async (productId: string, addonFields: AddonFields): Promise<ProductAddon | undefined> => {
    loading.value = true
    try {
      const createResponse = await apiFetch<ApiEnvelope<ProductAddon>>(`/api/products/${productId}/addons`, {
        method: 'POST',
        body: addonFields,
      })
      addons.value.push(createResponse.data)
      toast.success(createResponse.message)
      return createResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add the add-on')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateAddon = async (addonId: string, addonFields: AddonFields): Promise<ProductAddon | undefined> => {
    loading.value = true
    try {
      const updateResponse = await apiFetch<ApiEnvelope<ProductAddon>>(`/api/addons/${addonId}`, {
        method: 'PUT',
        body: addonFields,
      })
      const addonIndex = addons.value.findIndex(existingAddon => existingAddon.id === addonId)
      if (addonIndex !== -1) addons.value[addonIndex] = updateResponse.data
      toast.success(updateResponse.message)
      return updateResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save the add-on')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteAddon = async (addonId: string): Promise<void> => {
    loading.value = true
    try {
      const deleteResponse = await apiFetch<ApiEnvelope<null>>(`/api/addons/${addonId}`, {
        method: 'DELETE',
      })
      addons.value = addons.value.filter(addon => addon.id !== addonId)
      toast.success(deleteResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete the add-on')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    addons,
    loading,
    fetchAddons,
    createAddon,
    updateAddon,
    deleteAddon,
  }
}
