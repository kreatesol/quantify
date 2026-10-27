import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "./api";

const KEY = "quantify.session";

export type StoredSession = { token: string; user: User };

// SecureStore keeps the session in the iOS Keychain / Android Keystore.
// It is not available on the web, where localStorage is used instead.
async function read(): Promise<string | null> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

export const sessionStore = {
  async get(): Promise<StoredSession | null> {
    const raw = await read();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  },
  async set(session: StoredSession): Promise<void> {
    const raw = JSON.stringify(session);
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(KEY, raw);
    await SecureStore.setItemAsync(KEY, raw);
  },
  async clear(): Promise<void> {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};
