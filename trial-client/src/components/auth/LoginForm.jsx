import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import InputField from "./InputField";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log({
      email,
      password,
    });

    // TODO:
    // gọi API login
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}

      <h2 className="text-4xl font-bold text-slate-800">Welcome Back 👋</h2>

      <p className="mt-3 text-slate-500">
        Login to continue your AI fitness journey.
      </p>

      {/* Form */}

      <div className="mt-10 space-y-6">
        <InputField
          label="Email"
          type="email"
          placeholder="Enter your email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <InputField
          label="Password"
          type="password"
          placeholder="Enter your password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Remember */}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-blue-600"
            />
            Remember me
          </label>

          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Forgot password?
          </button>
        </div>

        {/* Login Button */}

        <button
          onClick={handleLogin}
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
          Login
        </button>

        {/* Divider */}

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">or continue with</span>

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
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>

        {/* Register */}

        <p className="pt-2 text-center text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
