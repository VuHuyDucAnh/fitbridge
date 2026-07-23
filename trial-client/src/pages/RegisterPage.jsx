import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, MailCheck } from "lucide-react";
import AuthShell, { TermsLinks } from "../components/auth/AuthShell";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";

function mapSignUpError(message, t) {
  const m = (message || "").toLowerCase();
  if (m.includes("already") || m.includes("registered") || m.includes("exists"))
    return t("auth.emailTaken");
  if (m.includes("password")) return t("auth.passwordShort");
  return t("auth.authFailed");
}

export default function RegisterPage() {
  const { t } = useI18n();
  const { signUp } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const errs = {};
    if (!form.name.trim()) errs.name = t("auth.nameRequired");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t("auth.emailInvalid");
    if (form.password.length < 8) errs.password = t("auth.passwordShort");
    if (form.confirm !== form.password) errs.confirm = t("auth.passwordMismatch");
    if (!agree) errs.agree = t("auth.mustAgree");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const res = await signUp(form.email.trim(), form.password, form.name.trim());
    setBusy(false);
    if (res.error) {
      setFormError(mapSignUpError(res.error, t));
      return;
    }
    if (res.needsConfirmation) {
      setConfirmSent(true);
      return;
    }
    navigate("/onboarding");
  };

  if (confirmSent) {
    return (
      <AuthShell>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-surface text-accent-strong">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold">{t("auth.signUpTitle")}</h1>
        <p className="mt-3 text-ink-2">{t("auth.checkEmail", { email: form.email.trim() })}</p>
        <Button to="/login" className="mt-8 w-full" size="lg">
          {t("nav.signIn")}
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-extrabold">{t("auth.signUpTitle")}</h1>
      <p className="mt-2 text-ink-2">{t("auth.signUpSubtitle")}</p>

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
        <Field label={t("auth.name")} value={form.name} error={errors.name} onChange={set("name")} autoComplete="name" maxLength={40} />
        <Field label={t("auth.email")} type="email" value={form.email} error={errors.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
        <Field
          label={t("auth.password")}
          type={show ? "text" : "password"}
          value={form.password}
          error={errors.password}
          onChange={set("password")}
          autoComplete="new-password"
          trailing={
            <button type="button" onClick={() => setShow((s) => !s)} className="glow rounded-lg p-1" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          }
        />
        <Field label={t("auth.confirmPassword")} type={show ? "text" : "password"} value={form.confirm} error={errors.confirm} onChange={set("confirm")} autoComplete="new-password" />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[0.88rem] text-ink-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={errors.agree ? true : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span><TermsLinks /></span>
          </label>
          {errors.agree && <p role="alert" className="mt-1.5 text-[0.8rem] font-medium text-danger">{errors.agree}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {busy ? t("auth.signingUp") : t("nav.signUp")}
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.9rem] text-ink-2">
        {t("auth.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-accent-strong hover:underline">
          {t("nav.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
