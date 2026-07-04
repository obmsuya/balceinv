import { Client, Stronghold } from '@tauri-apps/plugin-stronghold'
import { appDataDir } from '@tauri-apps/api/path'

const VAULT_PASSWORD = 'balceinv-desktop-vault-v1'
const CLIENT_NAME = 'balceinv-auth'

let strongholdPromise: Promise<Stronghold> | null = null
let clientPromise: Promise<Client> | null = null

const getStronghold = () => {
  if (!strongholdPromise) {
    strongholdPromise = appDataDir().then((dir) => Stronghold.load(`${dir}/vault.hold`, VAULT_PASSWORD))
  }
  return strongholdPromise
}

const getClient = async () => {
  if (!clientPromise) {
    clientPromise = getStronghold().then(async (stronghold) => {
      try {
        return await stronghold.loadClient(CLIENT_NAME)
      } catch {
        return await stronghold.createClient(CLIENT_NAME)
      }
    })
  }
  return clientPromise
}

export const useSecureStorage = () => {
  const setToken = async (key: string, value: string) => {
    const stronghold = await getStronghold()
    const client = await getClient()
    await client.getStore().insert(key, Array.from(new TextEncoder().encode(value)))
    await stronghold.save()
  }

  const getToken = async (key: string): Promise<string | null> => {
    try {
      const client = await getClient()
      const data = await client.getStore().get(key)
      if (!data) return null
      return new TextDecoder().decode(new Uint8Array(data))
    } catch {
      return null
    }
  }

  const clearTokens = async () => {
    const stronghold = await getStronghold()
    const client = await getClient()
    await client.getStore().remove('access_token')
    await client.getStore().remove('refresh_token')
    await stronghold.save()
  }

  return { setToken, getToken, clearTokens }
}
