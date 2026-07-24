import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";

/** Map Supabase auth errors to safe, localized copy (never leak raw output). */
function mapAuthError(message, t) {
  const m = (message || "").toLowerCase();
  if (m.includes("provider") || m.includes("logins are disabled") || m.includes("signups are disabled") || m.includes("disabled"))
    return t("auth.providerDisabled");
  if (m.includes("invalid login") || m.includes("credentials")) return t("auth.invalidCredentials");
  if (m.includes("confirm")) return t("auth.confirmOff");
  return t("auth.authFailed");
}

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const errs = {};
    if (username.trim().length < 3) errs.username = t("auth.usernameShort");
    if (password.length < 8) errs.password = t("auth.passwordShort");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const res = await signIn(username.trim(), password);
    setBusy(false);
    if (res.error) {
      setFormError(mapAuthError(res.error, t));
      return;
    }
    navigate(res.onboarded ? "/dashboard" : "/onboarding");
  };

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-extrabold">{t("auth.signInTitle")}</h1>
      <p className="mt-2 text-ink-2">{t("auth.signInSubtitle")}</p>

      {formError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[0.88rem] font-medium text-danger"
        >
          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <Field
          label={t("auth.username")}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          error={errors.username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("auth.usernamePlaceholder")}
          trailing={<span className="whitespace-nowrap text-[0.8rem] font-semibold text-ink-3">@fitbridge.app</span>}
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
        <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-ink-2">
          <input type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: "var(--accent)" }} />
          {t("auth.remember")}
        </label>
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {busy ? t("auth.signingIn") : t("nav.signIn")}
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
