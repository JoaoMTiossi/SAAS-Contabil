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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function EmailInput({ label, value, onChange, placeholder, alerta, required }: Props) {
  const [erro, setErro] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    onChange(e.target.value || null);
  }

  function handleBlur() {
    const v = value ?? "";
    if (!v) {
      if (required) setErro("Campo obrigatório");
      return;
    }
    if (!isValidEmail(v)) {
      setErro("E-mail inválido");
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
        type="email"
        value={value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? "exemplo@email.com"}
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
