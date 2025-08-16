export const XLARGE_CREDIT_PACKAGE = {
  key: 'xlarge' as const,
  name: 'Extra Large Package',
  price: 10,
  completions: 500,
  credits: 10,
  description: '500 chat completions + Dual AI Builder',
  features: [
    '500 chat completions',
    'Dual AI Builder',
    'Maximum value package'
  ]
};

export default XLARGE_CREDIT_PACKAGE;