/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_ROLE_PERMISSIONS,
  Employee,
  EmployeeActivityLog,
  EmployeeRole,
  EmployeeSalesReport,
} from '../types/employee';
import { Sale } from '../types/pos';
import { addAuditLog } from './storage';

const STORAGE_KEYS = {
  EMPLOYEES: 'mosafa_pos_db_employees',
  EMPLOYEE_ACTIVITY: 'mosafa_pos_db_employee_activity',
  SALES: 'mosafa_pos_db_sales',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
}

// -----------------------------------------------------------------------------
// 1. INITIALIZE DEMO EMPLOYEES
// -----------------------------------------------------------------------------
export function initializeShopEmployees(shopId: string, ownerName = 'দোকান স্বত্বাধিকারী', ownerPhone = '01700000000'): void {
  const existing = getEmployeesByShop(shopId);
  if (existing.length > 0) return;

  const now = new Date().toISOString();

  const ownerEmp: Employee = {
    id: crypto.randomUUID(),
    shopId,
    name: ownerName,
    phone: ownerPhone,
    role: 'OWNER',
    passcode: '1234',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.OWNER },
    isActive: true,
    joiningDate: now.slice(0, 10),
    notes: 'প্রধান স্বত্বাধিকারী ও পূর্ণ নিয়ন্ত্রণকারী',
    createdAt: now,
    updatedAt: now,
  };

  const managerEmp: Employee = {
    id: crypto.randomUUID(),
    shopId,
    name: 'আরিফুল ইসলাম',
    phone: '01812345678',
    email: 'ariful@gmail.com',
    role: 'MANAGER',
    passcode: '2345',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.MANAGER },
    isActive: true,
    salary: 22000,
    joiningDate: '2026-01-15',
    notes: 'দোকান ও স্টক ইনচার্জ',
    createdAt: now,
    updatedAt: now,
  };

  const cashierEmp: Employee = {
    id: crypto.randomUUID(),
    shopId,
    name: 'তানভীর আহমেদ',
    phone: '01912345678',
    role: 'CASHIER',
    passcode: '3456',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.CASHIER },
    isActive: true,
    salary: 15000,
    joiningDate: '2026-02-01',
    notes: 'পিওএস ও বিলিং অপারেটর',
    createdAt: now,
    updatedAt: now,
  };

  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  all.push(ownerEmp, managerEmp, cashierEmp);
  setItem(STORAGE_KEYS.EMPLOYEES, all);

  // Initial Activity Log
  recordEmployeeActivity(shopId, ownerEmp.id, ownerEmp.name, 'INITIALIZE_STAFF', 'কর্মচারী টিম ও রোল ইনিশিয়ালাইজ করা হয়েছে');
}

// -----------------------------------------------------------------------------
// 2. GET & MANAGE EMPLOYEES
// -----------------------------------------------------------------------------
export function getEmployeesByShop(shopId: string): Employee[] {
  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  return all.filter((e) => e.shopId === shopId);
}

export function getEmployeeById(id: string): Employee | undefined {
  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  return all.find((e) => e.id === id);
}

export function saveEmployee(params: {
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  role: EmployeeRole;
  customRoleTitle?: string;
  passcode: string;
  permissions?: Partial<Employee['permissions']>;
  salary?: number;
  notes?: string;
  actorId?: string;
}): Employee {
  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  const now = new Date().toISOString();

  // Validate duplicate phone in the same shop
  const duplicate = all.find((e) => e.shopId === params.shopId && e.phone === params.phone);
  if (duplicate) {
    throw new Error(`'${params.phone}' নম্বরে ইতিমধ্যে একজন কর্মী যুক্ত রয়েছে (${duplicate.name})।`);
  }

  const basePermissions = DEFAULT_ROLE_PERMISSIONS[params.role] || DEFAULT_ROLE_PERMISSIONS.CASHIER;
  const mergedPermissions = {
    ...basePermissions,
    ...(params.permissions || {}),
  };

  const newEmployee: Employee = {
    id: crypto.randomUUID(),
    shopId: params.shopId,
    name: params.name,
    phone: params.phone,
    email: params.email,
    role: params.role,
    customRoleTitle: params.customRoleTitle,
    passcode: params.passcode || '1111',
    permissions: mergedPermissions,
    isActive: true,
    salary: params.salary,
    joiningDate: now.slice(0, 10),
    notes: params.notes,
    createdAt: now,
    updatedAt: now,
  };

  all.push(newEmployee);
  setItem(STORAGE_KEYS.EMPLOYEES, all);

  recordEmployeeActivity(params.shopId, newEmployee.id, newEmployee.name, 'EMPLOYEE_INVITED', `নতুন কর্মী যুক্ত করা হয়েছে: ${newEmployee.role}`);

  addAuditLog({
    shopId: params.shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'ADD_EMPLOYEE',
      employeeId: newEmployee.id,
      name: newEmployee.name,
      role: newEmployee.role,
      actorId: params.actorId,
    },
  });

  return newEmployee;
}

export function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, 'id' | 'shopId' | 'createdAt'>>,
  actorId?: string
): Employee {
  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('কর্মী খুঁজে পাওয়া যায়নি।');

  const prev = all[idx];
  const updated: Employee = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  setItem(STORAGE_KEYS.EMPLOYEES, all);

  recordEmployeeActivity(
    updated.shopId,
    updated.id,
    updated.name,
    'EMPLOYEE_UPDATED',
    `তথ্য বা পারমিশন পরিবর্তন করা হয়েছে`
  );

  addAuditLog({
    shopId: updated.shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'UPDATE_EMPLOYEE',
      employeeId: updated.id,
      name: updated.name,
      actorId,
    },
  });

  return updated;
}

export function toggleEmployeeActive(id: string, actorId?: string): Employee {
  const all = getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('কর্মী খুঁজে পাওয়া যায়নি।');

  if (all[idx].role === 'OWNER') {
    throw new Error('স্বত্বাধিকারী বা ওনার অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়।');
  }

  all[idx].isActive = !all[idx].isActive;
  all[idx].updatedAt = new Date().toISOString();
  setItem(STORAGE_KEYS.EMPLOYEES, all);

  const status = all[idx].isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়';
  recordEmployeeActivity(
    all[idx].shopId,
    all[idx].id,
    all[idx].name,
    'STATUS_TOGGLED',
    `অ্যাকাউন্ট স্ট্যাটাস পরিবর্তন: ${status}`
  );

  addAuditLog({
    shopId: all[idx].shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'TOGGLE_EMPLOYEE_STATUS',
      employeeId: all[idx].id,
      name: all[idx].name,
      isActive: all[idx].isActive,
      actorId,
    },
  });

  return all[idx];
}

// -----------------------------------------------------------------------------
// 3. EMPLOYEE ACTIVITY LOGGING
// -----------------------------------------------------------------------------
export function recordEmployeeActivity(
  shopId: string,
  employeeId: string,
  employeeName: string,
  action: string,
  details: string
): EmployeeActivityLog {
  const all = getItem<EmployeeActivityLog[]>(STORAGE_KEYS.EMPLOYEE_ACTIVITY, []);
  const log: EmployeeActivityLog = {
    id: crypto.randomUUID(),
    shopId,
    employeeId,
    employeeName,
    action,
    details,
    createdAt: new Date().toISOString(),
  };
  all.unshift(log);
  if (all.length > 500) all.length = 500; // Cap at 500 recent items
  setItem(STORAGE_KEYS.EMPLOYEE_ACTIVITY, all);
  return log;
}

export function getEmployeeActivityLogs(shopId: string, limit = 50): EmployeeActivityLog[] {
  const all = getItem<EmployeeActivityLog[]>(STORAGE_KEYS.EMPLOYEE_ACTIVITY, []);
  return all.filter((l) => l.shopId === shopId).slice(0, limit);
}

// -----------------------------------------------------------------------------
// 4. EMPLOYEE SALES PERFORMANCE REPORT
// -----------------------------------------------------------------------------
export function getEmployeeSalesPerformance(
  shopId: string,
  startDate?: string,
  endDate?: string
): EmployeeSalesReport[] {
  const employees = getEmployeesByShop(shopId);
  const sales = getItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => {
    if (s.shopId !== shopId || s.status === 'CANCELLED') return false;
    if (startDate && s.createdAt < startDate) return false;
    if (endDate && s.createdAt > endDate) return false;
    return true;
  });

  return employees.map((emp) => {
    // Sales attributed to this employee or default to cashier/owner
    const empSales = sales.filter((s) => s.cashierId === emp.id || (!s.cashierId && emp.role === 'OWNER'));
    const totalRevenue = empSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalDiscountGiven = empSales.reduce(
      (sum, s) => sum + s.cartDiscount + (s.itemDiscountsTotal || 0),
      0
    );
    const totalSalesCount = empSales.length;
    const averageSaleValue = totalSalesCount > 0 ? Number((totalRevenue / totalSalesCount).toFixed(2)) : 0;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      totalSalesCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalDiscountGiven: Number(totalDiscountGiven.toFixed(2)),
      averageSaleValue,
    };
  });
}
