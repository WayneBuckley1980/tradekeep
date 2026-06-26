import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
export const ENTITLEMENT_ID = 'pro';
export const PRODUCT_MONTHLY = 'tradekeep_pro_monthly';
export const PRODUCT_ANNUAL = 'tradekeep_pro_annual';

export const isPurchasesConfigured = Boolean(apiKey) && Platform.OS === 'ios';

let initialized = false;

export async function initPurchases(userId?: string) {
  if (!isPurchasesConfigured || initialized) return;

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey, appUserID: userId });
  initialized = true;
}

export async function loginPurchases(userId: string) {
  if (!isPurchasesConfigured) return;
  await initPurchases(userId);
  await Purchases.logIn(userId);
}

export async function logoutPurchases() {
  if (!isPurchasesConfigured) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore if not logged in
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isPurchasesConfigured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export async function restorePurchases(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  const customerInfo = await Purchases.restorePurchases();
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export async function hasProEntitlement(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export function subscribeToCustomerInfo(callback: () => void) {
  if (!isPurchasesConfigured) return () => {};
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {};
}

export { PurchasesPackage };
