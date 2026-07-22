import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import InputField from "./InputField";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [agree, setAgree] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleRegister = () => {
    console.log({
      ...formData,
      agree,
    });

    // TODO:
    // Call Register API
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <h2 className="text-4xl font-bold text-slate-800">Create Account 🚀</h2>

      <p className="mt-3 text-slate-500">
        Join AI Fitness Coach and start tracking your workouts.
      </p>

      {/* Form */}
      <div className="mt-8 space-y-5">
        <InputField
          label="Full Name"
          placeholder="Enter your full name"
          icon={User}
          value={formData.fullName}
          onChange={handleChange("fullName")}
        />

        <InputField
          label="Email"
          type="email"
          placeholder="Enter your email"
          icon={Mail}
          value={formData.email}
          onChange={handleChange("email")}
        />

        <InputField
          label="Password"
          type="password"
          placeholder="Create a password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange("password")}
        />

        <InputField
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          icon={Lock}
          value={formData.confirmPassword}
          onChange={handleChange("confirmPassword")}
        />

        {/* Terms */}
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4 accent-blue-600"
          />

          <span>
            I agree to the{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
            >
              Privacy Policy
            </button>
          </span>
        </label>

        {/* Register Button */}
        <button
          onClick={handleRegister}
          className="
            h-14
            w-full
            rounded-2xl
            bg-gradient-to-r
            from-blue-600
            to-indigo-600
            text-lg
            font-semibold
            text-white
            shadow-lg
            transition
            hover:scale-[1.02]
            hover:shadow-xl
            active:scale-100
          "
        >
          Create Account
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">or sign up with</span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google */}
        <button
          className="
            flex
            h-14
            w-full
            items-center
            justify-center
            gap-3
            rounded-2xl
            border
            border-slate-200
            bg-white
            font-medium
            transition
            hover:bg-slate-100
          "
        >
          <img src="/google.svg" alt="Google" className="h-5 w-5" />
          Continue with Google
        </button>

        {/* Login */}
        <p className="pt-2 text-center text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
