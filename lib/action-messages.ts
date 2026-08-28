import { getLocale } from 'next-intl/server';

/**
 * Localized (fa/en) messages returned by server actions and surfaced in
 * toasts. Persian is the default site language.
 */
const messages = {
  en: {
    // Session
    sessionExpired: 'Your session has expired — please sign in again',
    unauthorized: 'You are not allowed to perform this action',
    tooManyAttempts:
      'Too many attempts. Please try again in {seconds} seconds.',
    // Stock / availability
    notEnoughStock: 'Not enough stock available',
    productNoLongerAvailable:
      '{name} is no longer available and was removed from your order',
    productHasOrders:
      'Cannot delete: {count} order(s) reference this product. Set its stock to 0 instead.',
    // Cart / order
    cartEmpty: 'Your cart is empty',
    addShippingAddress: 'Please add a shipping address first',
    selectPaymentMethod: 'Please select a payment method first',
    codNotAvailable:
      'Cash on delivery is not available for some products in your cart',
    orderCreated: 'Order placed successfully',
    orderNotFound: 'Order not found',
    orderAlreadyPaid: 'Order is already paid',
    orderAlreadyDelivered: 'Order is already delivered',
    orderMustBePaid: 'Order must be paid before it can be delivered',
    // Products
    productCreated: 'Product created successfully',
    productUpdated: 'Product updated successfully',
    productDeleted: 'Product deleted successfully',
    productNotFound: 'Product not found',
    // Categories
    categoryCreated: 'Category created successfully',
    categoryUpdated: 'Category updated successfully',
    categoryDeleted: 'Category deleted successfully',
    slugExists: 'This slug is already in use',
    categoryInUse: 'Products still use this category ({count})',
    // Users
    userUpdated: 'Profile updated successfully',
    userDeleted: 'User deleted successfully',
    cannotDeleteSelf: 'You cannot delete your own account',
    // Reviews
    reviewSaved: 'Your review has been saved',
    // Settings
    languageUpdated: 'Language updated',
    fontUpdated: 'Font updated',
    homeSaved: 'Homepage content saved',
    invalidValue: 'Invalid value',
  },
  fa: {
    // Session
    sessionExpired: 'نشست شما منقضی شده است — لطفاً دوباره وارد شوید',
    unauthorized: 'اجازه انجام این کار را ندارید',
    tooManyAttempts: 'تلاش‌های بیش از حد. لطفاً پس از {seconds} ثانیه دوباره تلاش کنید.',
    // Stock / availability
    notEnoughStock: 'موجودی کافی نیست',
    productNoLongerAvailable: '{name} دیگر موجود نیست و از سفارش شما حذف شد',
    productHasOrders:
      'حذف ناممکن است: {count} سفارش به این محصول وابسته است. به جای حذف، موجودی را صفر کنید.',
    // Cart / order
    cartEmpty: 'سبد خرید شما خالی است',
    addShippingAddress: 'لطفاً ابتدا آدرس تحویل را وارد کنید',
    selectPaymentMethod: 'لطفاً ابتدا روش پرداخت را انتخاب کنید',
    codNotAvailable:
      'برخی از کالاهای سبد خرید، پرداخت در محل را ندارند',
    orderCreated: 'سفارش با موفقیت ثبت شد',
    orderNotFound: 'سفارش یافت نشد',
    orderAlreadyPaid: 'این سفارش قبلاً پرداخت شده است',
    orderAlreadyDelivered: 'این سفارش قبلاً تحویل داده شده است',
    orderMustBePaid: 'برای ثبت تحویل، ابتدا باید پرداخت سفارش ثبت شود',
    // Products
    productCreated: 'محصول با موفقیت ایجاد شد',
    productUpdated: 'محصول با موفقیت به‌روزرسانی شد',
    productDeleted: 'محصول با موفقیت حذف شد',
    productNotFound: 'محصول یافت نشد',
    // Categories
    categoryCreated: 'دسته‌بندی با موفقیت ایجاد شد',
    categoryUpdated: 'دسته‌بندی با موفقیت به‌روزرسانی شد',
    categoryDeleted: 'دسته‌بندی با موفقیت حذف شد',
    slugExists: 'این نامک (اسلاگ) قبلاً استفاده شده است',
    categoryInUse: '{count} محصول هنوز از این دسته‌بندی استفاده می‌کنند',
    // Users
    userUpdated: 'پروفایل با موفقیت به‌روزرسانی شد',
    userDeleted: 'کاربر با موفقیت حذف شد',
    cannotDeleteSelf: 'نمی‌توانید حساب کاربری خودتان را حذف کنید',
    // Reviews
    reviewSaved: 'دیدگاه شما با موفقیت ثبت شد',
    // Settings
    languageUpdated: 'زبان سایت به‌روزرسانی شد',
    fontUpdated: 'فونت سایت به‌روزرسانی شد',
    homeSaved: 'محتوای صفحه اصلی ذخیره شد',
    invalidValue: 'مقدار نامعتبر است',
  },
} as const;

export type ActionMessageKey = keyof typeof messages.en;

/** Resolve a localized action message (Persian default). */
export async function withActionMessage(
  key: ActionMessageKey,
  vars?: Record<string, string | number>
): Promise<string> {
  const locale = ((await getLocale()) as 'fa' | 'en') ?? 'fa';
  let template: string = messages[locale]?.[key] ?? messages.en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(`{${k}}`, String(v));
    }
  }
  return template;
}
