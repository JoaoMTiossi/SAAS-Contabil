"use client";

import { useState } from "react";

interface Props {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  alerta?: boolean;
  required?: boolean;
}

function validarCnpj(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;

  const calc = (nums: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(nums[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(nums[len]);
  };

  return calc(nums, 12) && calc(nums, 13);
}

function formatarCnpj(raw: string): string {
  const nums = raw.replace(/\D/g, "").slice(0, 14);
  if (nums.length <= 2) return nums;
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`;
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
  if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`;
}

export function CnpjInput({ label, value, onChange, placeholder, alerta, required }: Props) {
  const [erro, setErro] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatarCnpj(e.target.value);
    setErro(null);
    onChange(formatted || null);
  }

  function handleBlur() {
    const v = value ?? "";
    if (!v) {
      if (required) setErro("Campo obrigatório");
      return;
    }
    const nums = v.replace(/\D/g, "");
    if (nums.length > 0 && nums.length < 14) {
      setErro("CNPJ incompleto");
    } else if (nums.length === 14 && !validarCnpj(v)) {
      setErro("CNPJ inválido");
    } else {
      setErro(null);
    }
  }

  const hasError = !!erro;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? "00.000.000/0000-00"}
        maxLength={18}
        className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
          ${hasError
            ? "border-red-300 bg-red-50 focus:ring-red-400"
            : alerta
            ? "border-yellow-300 bg-yellow-50 focus:ring-yellow-400"
            : "border-gray-200 focus:ring-blue-400"
          }`}
      />
      {hasError && <p className="mt-0.5 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
