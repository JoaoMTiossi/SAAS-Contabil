"use client";

import { useState, useRef } from "react";

interface Props {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  alerta?: boolean;
  required?: boolean;
}

function isValidDate(dateStr: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [d, m, y] = dateStr.split("/").map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function DateInput({ label, value, onChange, placeholder, alerta, required }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }

    setErro(null);
    onChange(formatted || null);
  }

  function handleBlur() {
    const v = value ?? "";
    if (!v) {
      if (required) setErro("Campo obrigatório");
      return;
    }
    if (v.length < 10) {
      setErro("Data incompleta");
      return;
    }
    if (!isValidDate(v)) {
      setErro("Data inválida");
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
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? "DD/MM/AAAA"}
        maxLength={10}
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
