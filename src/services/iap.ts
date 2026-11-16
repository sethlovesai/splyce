import { Platform } from 'react-native';

import { ensureHostId } from './firebase';

/**
 * One-time "unlock unlimited scans" purchase, via RevenueCat.
 *
 * RevenueCat is the source of truth for unlock status: a purchase grants the
 * "Splyce Pro" entitlement, which RevenueCat validates server-side and caches
 * on-device (so isUnlocked() works offline after the first fetch). That's the
 * security win over a client-writable flag — nothing here can be faked by
 * editing Firestore.
 *
 * react-native-purchases is a native module (absent in Expo Go), so it's loaded
 * lazily and every call degrades gracefully when it's unavailable — the app
 * still runs and the paywall shows an "unavailable" state instead of crashing.
 */

// Must match the entitlement identifier configured in the RevenueCat dashboard.
export const ENTITLEMENT_ID = 'Splyce Pro';
// Must match the offering identifier configured in the RevenueCat dashboard —
// looked up by name rather than relying on whichever offering happens to be
// marked "current", so a dashboard change can't silently swap the package.
export const OFFERING_ID = 'splyce_pro_offering';
// Shown until the store's localized price is fetched.
export const UNLOCK_PRICE_FALLBACK = '$4.99';

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'unavailable' | 'error';

type RNPurchases = typeof import('react-native-purchases').default;

let Purchases: RNPurchases | null = null;
let configured = false;
let loadFailed = false;

async function loadPurchases(): Promise<RNPurchases | null> {
  if (Purchases || loadFailed) return Purchases;
  try {
    Purchases = (await import('react-native-purchases')).default;
  } catch {
    loadFailed = true;
  }
  return Purchases;
}

/**
 * Configure RevenueCat once, tied to the user's anonymous Firebase uid so the
 * entitlement follows them across devices. No-op if the native module isn't
 * present (Expo Go) or no key is set. Call once at app start.
 */
export async function initPurchases(): Promise<void> {
  if (configured) return;
  const P = await loadPurchases();
  if (!P) return;
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) return;
  try {
    const uid = await ensureHostId();
    P.configure({ apiKey, appUserID: uid });
    configured = true;
  } catch {
    // leave unconfigured — treated as locked/unavailable everywhere below
  }
}

async function ready(): Promise<RNPurchases | null> {
  if (!configured) await initPurchases();
  return configured ? Purchases : null;
}

/** The "Splyce Pro" lifetime-unlock package from the named offering. */
async function getLifetimePackage(P: RNPurchases) {
  const offerings = await P.getOfferings();
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;
  return offering?.lifetime ?? offering?.availablePackages?.[0] ?? null;
}

/** Whether the "Splyce Pro" entitlement is active (RevenueCat-validated). */
export async function isUnlocked(): Promise<boolean> {
  const P = await ready();
  if (!P) return false;
  try {
    const info = await P.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

/** Localized price of the lifetime unlock, or the fallback string. */
export async function getUnlockPrice(): Promise<string> {
  const P = await ready();
  if (!P) return UNLOCK_PRICE_FALLBACK;
  try {
    const pkg = await getLifetimePackage(P);
    return pkg?.product.priceString ?? UNLOCK_PRICE_FALLBACK;
  } catch {
    return UNLOCK_PRICE_FALLBACK;
  }
}

/** Trigger the store purchase sheet for the one-time unlock. */
export async function purchaseUnlock(): Promise<PurchaseOutcome> {
  const P = await ready();
  if (!P) return 'unavailable';
  try {
    const pkg = await getLifetimePackage(P);
    if (!pkg) return 'unavailable';
    const { customerInfo } = await P.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ? 'purchased' : 'error';
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return 'cancelled';
    return 'error';
  }
}

/** Restore a previous purchase. Returns true if the unlock entitlement is active. */
export async function restoreUnlock(): Promise<boolean> {
  const P = await ready();
  if (!P) return false;
  try {
    const info = await P.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}
