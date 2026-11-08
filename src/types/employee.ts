/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmployeeRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'ACCOUNTANT'
  | 'CUSTOM';

export interface EmployeePermissions {
  viewDashboard: boolean;
  createSales: boolean;
  editSales: boolean;
  cancelSales: boolean;
  viewPurchasePrices: boolean;
  manageProducts: boolean;
  manageStock: boolean;
  createPurchases: boolean;
  manageCustomers: boolean;
  manageSuppliers: boolean;
  viewReports: boolean;
  manageExpenses: boolean;
  manageEmployees: boolean;
  changeShopSettings: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<EmployeeRole, EmployeePermissions> = {
  OWNER: {
    viewDashboard: true,
    createSales: true,
    editSales: true,
    cancelSales: true,
    viewPurchasePrices: true,
    manageProducts: true,
    manageStock: true,
    createPurchases: true,
    manageCustomers: true,
    manageSuppliers: true,
    viewReports: true,
    manageExpenses: true,
    manageEmployees: true,
    changeShopSettings: true,
  },
  ADMIN: {
    viewDashboard: true,
    createSales: true,
    editSales: true,
    cancelSales: true,
    viewPurchasePrices: true,
    manageProducts: true,
    manageStock: true,
    createPurchases: true,
    manageCustomers: true,
    manageSuppliers: true,
    viewReports: true,
    manageExpenses: true,
    manageEmployees: true,
    changeShopSettings: false,
  },
  MANAGER: {
    viewDashboard: true,
    createSales: true,
    editSales: true,
    cancelSales: false,
    viewPurchasePrices: true,
    manageProducts: true,
    manageStock: true,
    createPurchases: true,
    manageCustomers: true,
    manageSuppliers: true,
    viewReports: true,
    manageExpenses: true,
    manageEmployees: false,
    changeShopSettings: false,
  },
  CASHIER: {
    viewDashboard: true,
    createSales: true,
    editSales: false,
    cancelSales: false,
    viewPurchasePrices: false,
    manageProducts: false,
    manageStock: false,
    createPurchases: false,
    manageCustomers: true,
    manageSuppliers: false,
    viewReports: false,
    manageExpenses: false,
    manageEmployees: false,
    changeShopSettings: false,
  },
  ACCOUNTANT: {
    viewDashboard: true,
    createSales: false,
    editSales: false,
    cancelSales: false,
    viewPurchasePrices: true,
    manageProducts: false,
    manageStock: false,
    createPurchases: false,
    manageCustomers: true,
    manageSuppliers: true,
    viewReports: true,
    manageExpenses: true,
    manageEmployees: false,
    changeShopSettings: false,
  },
  CUSTOM: {
    viewDashboard: true,
    createSales: true,
    editSales: false,
    cancelSales: false,
    viewPurchasePrices: false,
    manageProducts: false,
    manageStock: false,
    createPurchases: false,
    manageCustomers: true,
    manageSuppliers: false,
    viewReports: false,
    manageExpenses: false,
    manageEmployees: false,
    changeShopSettings: false,
  },
};

export interface Employee {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  role: EmployeeRole;
  customRoleTitle?: string;
  passcode: string; // 4-6 digit POS quick switch passcode
  permissions: EmployeePermissions;
  isActive: boolean;
  salary?: number;
  joiningDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeActivityLog {
  id: string;
  shopId: string;
  employeeId: string;
  employeeName: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface EmployeeSalesReport {
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  totalSalesCount: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  averageSaleValue: number;
}
