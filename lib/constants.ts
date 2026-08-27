export const APP_NAME = 'پناه کالا';
export const APP_NAME_EN = 'Panah Kala';

/** Free-shipping threshold in Toman */
export const FREE_SHIPPING_THRESHOLD = 500_000;

/** Flat shipping rate in Toman (applied below the free-shipping threshold) */
export const SHIPPING_FLAT_RATE = 50_000;

/** VAT rate applied to the items subtotal (Iranian value-added tax) */
export const TAX_RATE = 0.09;

export const CURRENCY = 'IRT';

export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;

export const signInDefaultValues = {
  email: '',
  password: '',
};

export const signUpDefaultValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};
