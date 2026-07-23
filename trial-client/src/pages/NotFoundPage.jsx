import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import { LogoMark } from "../components/ui/Logo";
import { useI18n } from "../i18n/LanguageContext";

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <PageShell footer={false}>
      <section className="grid min-h-[70vh] place-items-center px-5 text-center">
        <div>
          <LogoMark size={64} className="mx-auto animate-float" />
          <p className="mt-8 font-display text-6xl font-extrabold text-accent-strong">404</p>
          <p className="mt-3 text-lg text-ink-2">{t("errors.notFound")}</p>
          <Button to="/" className="mt-8">
            {t("errors.goHome")}
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
