import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn, profile } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = t("auth.emailInvalid");
    if (password.length < 8) errs.password = t("auth.passwordShort");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    signIn(email.trim());
    navigate(profile.onboarded ? "/dashboard" : "/onboarding");
  };

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-extrabold">{t("auth.signInTitle")}</h1>
      <p className="mt-2 text-ink-2">{t("auth.signInSubtitle")}</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <Field
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label={t("auth.password")}
          type={show ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          trailing={
            <button type="button" onClick={() => setShow((s) => !s)} className="glow rounded-lg p-1" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          }
        />
        <div className="flex items-center justify-between text-[0.85rem]">
          <label className="flex cursor-pointer items-center gap-2 text-ink-2">
            <input type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: "var(--accent)" }} />
            {t("auth.remember")}
          </label>
          <Link to="/login" className="font-semibold text-accent-strong hover:underline">
            {t("auth.forgot")}
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg">
          {t("nav.signIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.9rem] text-ink-2">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-accent-strong hover:underline">
          {t("nav.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
}
