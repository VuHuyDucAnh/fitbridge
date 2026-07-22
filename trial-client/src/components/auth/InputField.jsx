import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      {/* Label */}
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {/* Input */}
      <div
        className={`
          flex items-center rounded-2xl border bg-slate-50 px-4 transition-all duration-200
          ${
            error
              ? "border-red-500"
              : "border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
          }
        `}
      >
        {Icon && <Icon size={20} className="mr-3 text-slate-400" />}

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-14 w-full bg-transparent outline-none placeholder:text-slate-400"
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 transition hover:text-slate-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
