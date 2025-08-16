import SMALL_CREDIT_PACKAGE from './small';
import MEDIUM_CREDIT_PACKAGE from './medium';
import LARGE_CREDIT_PACKAGE from './large';
import XLARGE_CREDIT_PACKAGE from './xlarge';

// Consolidated credit packages
export const CREDIT_PACKAGES = {
  small: SMALL_CREDIT_PACKAGE,
  medium: MEDIUM_CREDIT_PACKAGE,
  large: LARGE_CREDIT_PACKAGE,
  xlarge: XLARGE_CREDIT_PACKAGE
};

// Export individual packages
export {
  SMALL_CREDIT_PACKAGE,
  MEDIUM_CREDIT_PACKAGE,
  LARGE_CREDIT_PACKAGE,
  XLARGE_CREDIT_PACKAGE
};

// Type for credit package keys
export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;