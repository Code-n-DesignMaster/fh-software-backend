export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  CANCELLED: 'cancelled'
};
export const PAYMENT_TYPE = {
  MONTHLY_SUBSCRIPTION: 'monthly_subscription',
  YEARLY_SUBSCRIPTION: 'yearly_subscription',
  SALE_VIDEO: 'sale_video',
  SALE_GALLERY: 'sale_gallery',
  PRODUCT: 'product',
  SEND_TIP: 'send_tip',
};
export const PAYMENT_TARTGET_TYPE = {
  PERFORMER: 'performer',
  PRODUCT: 'product',
  VIDEO: 'video',
  GALLERY: 'gallery',
  PERFORMER_TIP: 'tip',
}
export const PAYMENT_PROVIDER = {
  CCBILL: 'ccbill',
  MOONLIGHT: 'moonlight'
}


export const TRANSACTION_SUCCESS_CHANNEL = 'TRANSACTION_SUCCESS_CHANNEL';

export const OVER_PRODUCT_STOCK = 'OVER_PRODUCT_STOCK';
export const DIFFERENT_PERFORMER_PRODUCT = 'DIFFERENT_PERFORMER_PRODUCT';
export const MISSING_CONFIG_PAYMENT_GATEWAY = 'Payment not configured for this model';

export const ORDER_STATUS = {
  PROCESSING: 'processing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  REFUNDED: 'refunded'
};
