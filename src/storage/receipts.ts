import AsyncStorage from '@react-native-async-storage/async-storage';
import { SummaryEntry } from '../types/navigation';

export type StoredReceipt = {
  id: string;
  restaurantName: string;
  total: number;
  date: string; // ISO string
  summary: SummaryEntry[];
};

const STORAGE_KEY = 'splyce:receipts';

export async function getReceipts(): Promise<StoredReceipt[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export async function addReceipt(receipt: StoredReceipt): Promise<void> {
  try {
    const existing = await getReceipts();
    const next = [receipt, ...existing].slice(0, 50); // cap history
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // fail silently; history isn't critical
  }
}

export async function removeReceipt(id: string): Promise<void> {
  try {
    const existing = await getReceipts();
    const next = existing.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // ignore
  }
}

export async function clearReceipts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
