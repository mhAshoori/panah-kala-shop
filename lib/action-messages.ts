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
    couponNotFound: 'Coupon code is invalid',
    couponInactive: 'This coupon is not active',
    couponExpired: 'This coupon has expired',
    couponMinCart: 'Your cart total is below this coupon minimum',
    couponUsageLimit: 'This coupon has reached its usage limit',
    couponApplied: 'Coupon {name} applied — {amount} Toman off',
    couponRemoved: 'Coupon removed',
    couponDuplicate: 'A coupon with this code already exists',
    couponInvalidCode: 'Code must be 3–40 latin letters, digits, - or _',
    couponInvalidValue: 'Enter a valid value, expiry date or usage limit',
    couponDeleted: 'Coupon deleted',
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
    // Addresses
    addressSaved: 'Address saved successfully',
    addressDeleted: 'Address deleted successfully',
    addressNotFound: 'Address not found',
    selectAddress: 'Please choose a shipping address first',
    contactOldCodeInvalid: 'The code sent to your previous contact is invalid',
    contactNewCodeInvalid: 'The code sent to your new contact is invalid',
    invalidEmail: 'Enter a valid email address',
    emailUpdated: 'Email updated successfully',
    mobileUpdated: 'Mobile number updated successfully',
    accountExists: 'An account with this email or mobile already exists',
    invalidOtp: 'The code is invalid or expired',
    otpSent: 'Code sent. Use the mock code 123456 for testing.',
    invalidPhone: 'Enter a valid mobile number (9XXXXXXXXX)',
    favoriteAdded: 'Added to your favorites',
    favoriteRemoved: 'Removed from your favorites',
    // Reviews
    reviewSaved: 'Your review has been saved',
    // Settings
    languageUpdated: 'Language updated',
    fontUpdated: 'Font updated',
    themeUpdated: 'Default theme updated',
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
    couponNotFound: 'کد تخفیف نامعتبر است',
    couponInactive: 'این کد تخفیف فعال نیست',
    couponExpired: 'این کد تخفیف منقضی شده است',
    couponMinCart: 'مبلغ سبد خرید برای این کد تخفیف کافی نیست',
    couponUsageLimit: 'سقف استفاده از این کد تخفیف پر شده است',
    couponApplied: 'کد تخفیف {name} اعمال شد — {amount} تومان تخفیف',
    couponRemoved: 'کد تخفیف حذف شد',
    couponDuplicate: 'کد تخفیف دیگری با این کد وجود دارد',
    couponInvalidCode: 'کد باید ۳ تا ۴۰ حرف لاتین، رقم یا خط تیره باشد',
    couponInvalidValue: 'مقدار، تاریخ انقضا یا سقف استفاده معتبر نیست',
    couponDeleted: 'کد تخفیف حذف شد',
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
    // Addresses
    addressSaved: 'نشانی با موفقیت ذخیره شد',
    addressDeleted: 'نشانی با موفقیت حذف شد',
    addressNotFound: 'نشانی یافت نشد',
    selectAddress: 'لطفاً ابتدا یک نشانی انتخاب کنید',
    contactOldCodeInvalid: 'کد ارسال‌شده به تماس قبلی نامعتبر است',
    contactNewCodeInvalid: 'کد ارسال‌شده به تماس جدید نامعتبر است',
    invalidEmail: 'ایمیل معتبر نیست',
    emailUpdated: 'ایمیل با موفقیت به‌روزرسانی شد',
    mobileUpdated: 'شماره موبایل با موفقیت به‌روزرسانی شد',
    accountExists: 'با این ایمیل یا شماره موبایل قبلاً حساب ساخته شده است',
    invalidOtp: 'کد وارد شده نامعتبر یا منقضی شده است',
    otpSent: 'کد ارسال شد. برای تست از کد ۱۲۳۴۵۶ استفاده کنید.',
    invalidPhone: 'شماره موبایل معتبر نیست (۹XXXXXXXXX)',
    favoriteAdded: 'به علاقه‌مندی‌ها اضافه شد',
    favoriteRemoved: 'از علاقه‌مندی‌ها حذف شد',
    // Reviews
    reviewSaved: 'دیدگاه شما با موفقیت ثبت شد',
    // Settings
    languageUpdated: 'زبان سایت به‌روزرسانی شد',
    fontUpdated: 'فونت سایت به‌روزرسانی شد',
    themeUpdated: 'پوسته پیش‌فرض به‌روزرسانی شد',
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
