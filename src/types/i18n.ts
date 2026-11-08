/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'bn' | 'en';

export interface TranslationDictionary {
  // Brand
  appName: string;
  tagline: string;
  independentAppNotice: string;

  // Nav items
  navDashboard: string;
  navPos: string;
  navProducts: string;
  navInventory: string;
  navPurchases: string;
  navCustomers: string;
  navSuppliers: string;
  navExpenses: string;
  navCashbook: string;
  navReturns: string;
  navReports: string;
  navEmployees: string;
  navSettings: string;
  stepUpcoming: string;
  stepBadge: string;

  // Auth & Signup
  login: string;
  signup: string;
  logout: string;
  loginTitle: string;
  signupTitle: string;
  signupSubtitle: string;
  loginSubtitle: string;
  stepA: string;
  stepB: string;
  stepC: string;
  stepD: string;
  stepE: string;
  stepF: string;
  stepAMobileTitle: string;
  stepBShopTitle: string;
  stepCPinTitle: string;
  stepDConfirmPinTitle: string;
  stepEPreviewTitle: string;
  stepFSuccessTitle: string;

  // Form Fields & Placeholders
  mobileNumber: string;
  mobileNumberPlaceholder: string;
  shopName: string;
  shopNamePlaceholder: string;
  sixDigitPin: string;
  confirmSixDigitPin: string;
  pinPlaceholder: string;
  selectShop: string;
  rememberDevice: string;
  forgotPin: string;
  showPin: string;
  hidePin: string;
  createShopButton: string;
  nextStep: string;
  previousStep: string;
  confirmAndCreate: string;
  goToDashboard: string;

  // Validation & Errors
  invalidMobile: string;
  validMobile: string;
  pinLengthError: string;
  pinWeakError: string;
  pinMismatchError: string;
  shopNameRequired: string;
  shopNameMinLength: string;
  duplicateShopName: string;
  invalidCredentials: string;
  accountLocked: string;
  accountLockedDesc: string;
  remainingAttempts: string;
  lockoutCountdown: string;
  noShopsFound: string;

  // Forgot PIN / Recovery
  forgotPinTitle: string;
  forgotPinDesc: string;
  otpDeliveryNotConfiguredTitle: string;
  otpDeliveryNotConfiguredDesc: string;
  smsProviderMissing: string;
  testSandboxBypass: string;
  simulateOtpSuccess: string;
  resetPin: string;
  newPin: string;
  confirmNewPin: string;
  pinResetSuccess: string;

  // Shop Preview & Welcome
  shopPreviewBadge: string;
  shopIdLabel: string;
  ownerLabel: string;
  welcomeHeading: string;
  welcomeSubheading: string;

  // Settings & Branding
  settingsTitle: string;
  settingsSubtitle: string;
  generalTab: string;
  brandingTab: string;
  receiptTab: string;
  securityTab: string;
  businessCategory: string;
  shopAddress: string;
  shopAddressPlaceholder: string;
  shopEmail: string;
  shopEmailPlaceholder: string;
  shopDescription: string;
  shopDescriptionPlaceholder: string;
  currency: string;
  languageSelect: string;
  saveChanges: string;
  changesSavedSuccess: string;

  // Logo upload
  shopLogo: string;
  uploadLogo: string;
  changeLogo: string;
  removeLogo: string;
  logoHint: string;
  logoCropFit: string;
  fitContain: string;
  fitCover: string;
  fitCircle: string;
  logoUploadSuccess: string;
  logoRemovedSuccess: string;
  fileTooLarge: string;
  invalidFileType: string;

  // Receipts
  receiptHeader: string;
  receiptHeaderPlaceholder: string;
  receiptFooter: string;
  receiptFooterPlaceholder: string;
  receiptFormat: string;
  thermal58: string;
  thermal80: string;
  slipA4: string;
  liveReceiptPreview: string;
  sampleItem: string;
  sampleQty: string;
  samplePrice: string;
  sampleTotal: string;
  vatTax: string;
  subtotal: string;
  discount: string;
  netPayable: string;
  thankYouMessage: string;

  // Brand color
  brandColor: string;
  brandColorDesc: string;
  welcomeText: string;

  // Categories
  catGeneral: string;
  catMobile: string;
  catComputer: string;
  catGrocery: string;
  catClothing: string;
  catCosmetics: string;
  catElectronics: string;
  catStationery: string;
  catPharmacy: string;
  catOther: string;

  // Test Lab
  testLabTitle: string;
  testLabDesc: string;
  runAllTests: string;
  testPassed: string;
  testFailed: string;
  testRunning: string;
  testReady: string;

  // Categories & Products (Step 2)
  categoriesTitle: string;
  addCategory: string;
  editCategory: string;
  categoryNameBn: string;
  categoryNameEn: string;
  parentCategory: string;
  noParent: string;
  productsTitle: string;
  addProduct: string;
  editProduct: string;
  productNameBn: string;
  productNameEn: string;
  sku: string;
  barcode: string;
  brand: string;
  model: string;
  purchasePrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  unit: string;
  currentStock: string;
  minStock: string;
  stockStatus: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  productImage: string;
  productVariants: string;
  addVariant: string;
  variantName: string;
  warranty: string;
  importCsv: string;
  exportCsv: string;
  allCategories: string;

  // Inventory & Stock Movements (Step 2)
  inventoryOverview: string;
  totalItems: string;
  totalStockUnits: string;
  stockValuation: string;
  retailValuation: string;
  potentialProfit: string;
  stockAdjustment: string;
  adjustStockTitle: string;
  newStockQty: string;
  adjustmentReason: string;
  reasonPurchase: string;
  reasonSale: string;
  reasonAdjustmentIn: string;
  reasonAdjustmentOut: string;
  reasonDamage: string;
  reasonLoss: string;
  stockMovementHistory: string;
  movementType: string;
  qtyDelta: string;
  previousStock: string;
  newStockVal: string;
  unitCostVal: string;

  // Customers & Suppliers (Step 2)
  customersTitle: string;
  addCustomer: string;
  editCustomer: string;
  customerName: string;
  outstandingDue: string;
  totalSpent: string;
  receivePayment: string;
  paymentAmount: string;
  paymentMethod: string;
  suppliersTitle: string;
  addSupplier: string;
  editSupplier: string;
  supplierName: string;
  contactPerson: string;
  payableBalance: string;
  paySupplier: string;

  // Purchases (Step 2)
  purchasesTitle: string;
  newPurchase: string;
  invoiceNumber: string;
  purchaseDate: string;
  selectSupplier: string;
  addItem: string;
  subtotalVal: string;
  additionalCosts: string;
  paidAmount: string;
  dueAmount: string;
  completePurchase: string;
  purchaseDetails: string;

  // Common
  cancel: string;
  confirm: string;
  close: string;
  copy: string;
  copied: string;
  loading: string;
  search: string;
  actions: string;
  status: string;
  active: string;
  themeLight: string;
  themeDark: string;
  switchShop: string;
  addNewShop: string;
}
