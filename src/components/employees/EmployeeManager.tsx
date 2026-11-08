/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Phone,
  Mail,
  KeyRound,
  CheckCircle2,
  XCircle,
  History,
  Edit2,
  Lock,
  Unlock,
  Check,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  DEFAULT_ROLE_PERMISSIONS,
  Employee,
  EmployeePermissions,
  EmployeeRole,
} from '../../types/employee';
import {
  getEmployeeActivityLogs,
  getEmployeesByShop,
  saveEmployee,
  toggleEmployeeActive,
  updateEmployee,
} from '../../services/employeeStorage';

const PERMISSION_LABELS: Record<keyof EmployeePermissions, { title: string; desc: string }> = {
  viewDashboard: { title: 'ড্যাশবোর্ড দর্শন', desc: 'মেইন ড্যাশবোর্ড ও মেট্রিক্স দেখার ক্ষমতা' },
  createSales: { title: 'বিক্রয় তৈরি (POS)', desc: 'পিওএস টার্মিনালে পণ্য বিক্রি ও মেমো তৈরি' },
  editSales: { title: 'বিক্রয় ও মূল্য পরিবর্তন', desc: 'কার্টে পণ্যের মূল্য বা ডিসকাউন্ট পরিবর্তন' },
  cancelSales: { title: 'বিক্রয় বাতিল (Cancel)', desc: 'সম্পন্ন মেমো বাতিল বা রিভার্স করার অনুমতি' },
  viewPurchasePrices: { title: 'ক্রয়মূল্য দর্শন', desc: 'পণ্যের পাইকারি ও ক্রয়মূল্য দেখার ক্ষমতা' },
  manageProducts: { title: 'পণ্য যোগ ও সম্পাদনা', desc: 'নতুন পণ্য তৈরি, নাম বা মূল্য আপডেট' },
  manageStock: { title: 'স্টক সমন্বয় ও ড্যামেজ', desc: 'মজুদ হ্রাস-বৃদ্ধি ও ক্ষতি রেকর্ড' },
  createPurchases: { title: 'ক্রয় চালান এন্ট্রি', desc: 'সাপ্লায়ার থেকে স্টক-ইন ও বিল এন্ট্রি' },
  manageCustomers: { title: 'গ্রাহক খাতা নিয়ন্ত্রণ', desc: 'গ্রাহক তৈরি ও বাকি আদায়' },
  manageSuppliers: { title: 'সরবরাহকারী খাতা', desc: 'সাপ্লায়ার তৈরি ও দেনা পরিশোধ' },
  viewReports: { title: 'ব্যবসায়িক রিপোর্ট দর্শন', desc: 'লাভ-ক্ষতি ও আর্থিক হিসাবের রিপোর্ট' },
  manageExpenses: { title: 'দোকানের খরচ এন্ট্রি', desc: 'দৈনন্দিন ব্যয় ভাউচার তৈরি ও পরিশোধ' },
  manageEmployees: { title: 'কর্মচারী পরিচালনা', desc: 'কর্মী নিয়োগ ও পারমিশন পরিবর্তন' },
  changeShopSettings: { title: 'দোকানের সেটিংস পরিবর্তন', desc: 'নাম, লোগো, পিন ও নীতি পরিবর্তন' },
};

export const EmployeeManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>(() =>
    currentShop ? getEmployeesByShop(currentShop.id) : []
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingPermissionsEmp, setEditingPermissionsEmp] = useState<Employee | null>(null);

  // Form State for Adding Employee
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    role: EmployeeRole;
    customRoleTitle: string;
    passcode: string;
    salary: string;
    notes: string;
    permissions: EmployeePermissions;
  }>({
    name: '',
    phone: '',
    email: '',
    role: 'CASHIER',
    customRoleTitle: '',
    passcode: '',
    salary: '',
    notes: '',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.CASHIER },
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!currentShop) return null;

  const reloadEmployees = () => {
    setEmployees(getEmployeesByShop(currentShop.id));
  };

  const handleRoleChange = (role: EmployeeRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.CASHIER) },
    }));
  };

  const handlePermissionToggle = (key: keyof EmployeePermissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('কর্মচারীর নাম আবশ্যক।');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('মোবাইল নম্বর আবশ্যক।');
      return;
    }
    if (!formData.passcode.trim() || formData.passcode.length < 4) {
      setFormError('পিওএস পাসকোড কমপক্ষে ৪ সংখ্যার হতে হবে।');
      return;
    }

    try {
      saveEmployee({
        shopId: currentShop.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        role: formData.role,
        customRoleTitle: formData.customRoleTitle.trim() || undefined,
        passcode: formData.passcode.trim(),
        permissions: formData.permissions,
        salary: formData.salary ? Number(formData.salary) : undefined,
        notes: formData.notes.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'নতুন কর্মী সফলভাবে যুক্ত হয়েছে',
        message: `${formData.name} (${formData.role}) টিম মেম্বার হিসেবে সক্রিয়।`,
      });

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        role: 'CASHIER',
        customRoleTitle: '',
        passcode: '',
        salary: '',
        notes: '',
        permissions: { ...DEFAULT_ROLE_PERMISSIONS.CASHIER },
      });
      reloadEmployees();
    } catch (err: any) {
      setFormError(err.message || 'কর্মী সংরক্ষণে সমস্যা হয়েছে।');
    }
  };

  const handleToggleActive = (emp: Employee) => {
    try {
      toggleEmployeeActive(emp.id);
      showToast({
        type: 'info',
        title: 'স্ট্যাটাস আপডেট',
        message: `${emp.name} এর অ্যাকাউন্ট স্ট্যাটাস পরিবর্তন হয়েছে।`,
      });
      reloadEmployees();
    } catch (err: any) {
      showToast({ type: 'error', title: err.message || 'ব্যর্থ হয়েছে' });
    }
  };

  const handleSaveUpdatedPermissions = () => {
    if (!editingPermissionsEmp) return;
    try {
      updateEmployee(editingPermissionsEmp.id, {
        permissions: editingPermissionsEmp.permissions,
      });
      showToast({
        type: 'success',
        title: 'অনুমতি আপডেট সম্পন্ন',
        message: `${editingPermissionsEmp.name} এর পারমিশন সফলভাবে সেভ হয়েছে।`,
      });
      setEditingPermissionsEmp(null);
      reloadEmployees();
    } catch {
      showToast({ type: 'error', title: 'আপডেট করতে সমস্যা হয়েছে' });
    }
  };

  const activityLogs = getEmployeeActivityLogs(currentShop.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              কর্মচারী ও পারমিশন ব্যবস্থাপনা (RBAC)
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {employees.length} জন কর্মী
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            দোকানের ম্যানেজার, ক্যাশিয়ার ও একাউন্ট্যান্টদের দায়িত্ব বণ্টন, পাসকোড ও অ্যাক্সেস নিয়ন্ত্রণ।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>অ্যাক্টিভিটি লগ ({activityLogs.length})</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কর্মী নিয়োগ</span>
          </button>
        </div>
      </div>

      {/* ---------------- 2. EMPLOYEES GRID ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => {
          const isOwner = emp.role === 'OWNER';
          const permissionCount = Object.values(emp.permissions).filter(Boolean).length;

          return (
            <div
              key={emp.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                emp.isActive
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{emp.name}</span>
                      {!emp.isActive && (
                        <span className="text-[10px] text-rose-500 font-bold uppercase">
                          (নিষ্ক্রিয়)
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{emp.phone}</span>
                      {emp.customRoleTitle ? (
                        <span className="text-slate-400">· {emp.customRoleTitle}</span>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {emp.role}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">অনুমতি মাত্রা:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isOwner ? 'সকল পূর্ণ ক্ষমতা' : `${permissionCount} / 14 টি পারমিশন`}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">পিওএস পাসকোড:</span>
                    <span className="font-mono text-emerald-600 font-bold tracking-widest">
                      {emp.passcode}
                    </span>
                  </div>

                  {emp.salary ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">মাসিক বেতন:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        ৳{emp.salary.toLocaleString()}
                      </span>
                    </div>
                  ) : null}

                  {emp.notes && (
                    <div className="text-[11px] text-slate-500 italic pt-1 line-clamp-1">
                      "{emp.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setEditingPermissionsEmp(emp)}
                  disabled={isOwner}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>পারমিশন</span>
                </button>

                {!isOwner && (
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      emp.isActive
                        ? 'border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        : 'border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    {emp.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{emp.isActive ? 'লক করুন' : 'আনলক করুন'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- 3. ADD EMPLOYEE MODAL ---------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span>নতুন কর্মচারী যুক্ত করুন</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ভূমিকা নির্বাচন করুন এবং নির্ধারিত অ্যাক্সেস পারমিশন প্রদান করুন।
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="mt-5 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    কর্মচারীর পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ভূমিকা (Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as EmployeeRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-semibold"
                  >
                    <option value="CASHIER">ক্যাশিয়ার (Cashier)</option>
                    <option value="MANAGER">ম্যানেজার (Manager)</option>
                    <option value="ACCOUNTANT">একাউন্ট্যান্ট (Accountant)</option>
                    <option value="ADMIN">অ্যাডমিন (Admin)</option>
                    <option value="CUSTOM">কাস্টম রোল (Custom Role)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ৪-সংখ্যার পিওএস পাসকোড *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    placeholder="যেমন: 4567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-mono tracking-widest text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    মাসিক বেতন (ঐচ্ছিক)
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="যেমন: 18000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Granular Permission Checklist */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-slate-100">
                    নির্দিষ্ট অ্যাক্সেস পারমিশন চেকলিস্ট:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    রোল টেমপ্লেট থেকে অটো-কনফিগার হয়েছে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {(Object.keys(formData.permissions) as (keyof EmployeePermissions)[]).map((key) => {
                    const info = PERMISSION_LABELS[key];
                    const isChecked = formData.permissions[key];
                    return (
                      <label
                        key={key}
                        onClick={() => handlePermissionToggle(key)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                          isChecked
                            ? 'border-emerald-600/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {info.title}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {info.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                >
                  কর্মী নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 4. EDIT PERMISSIONS MODAL ---------------- */}
      {editingPermissionsEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>পারমিশন পরিবর্তন: {editingPermissionsEmp.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  পদবী: {editingPermissionsEmp.role}
                </p>
              </div>
              <button
                onClick={() => setEditingPermissionsEmp(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {(Object.keys(editingPermissionsEmp.permissions) as (keyof EmployeePermissions)[]).map((key) => {
                const info = PERMISSION_LABELS[key];
                const isChecked = editingPermissionsEmp.permissions[key];
                return (
                  <label
                    key={key}
                    onClick={() => {
                      setEditingPermissionsEmp({
                        ...editingPermissionsEmp,
                        permissions: {
                          ...editingPermissionsEmp.permissions,
                          [key]: !isChecked,
                        },
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                      isChecked
                        ? 'border-emerald-600/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {info.title}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {info.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPermissionsEmp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveUpdatedPermissions}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 5. ACTIVITY LOG MODAL ---------------- */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>কর্মচারীদের সাম্প্রতিক অডিট ও অ্যাক্টিভিটি লগ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  বিক্রয়, মূল্য পরিবর্তন, স্টক হ্রাস ও সেটিংস সম্পাদনার রেকর্ড
                </p>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {activityLogs.length === 0 ? (
                <p className="py-8 text-center text-slate-400">কোনো রেকর্ড পাওয়া যায়নি।</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {log.employeeName}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] ml-2">
                        [{log.action}]
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {log.details}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
