import { Activity, ScanLine, ShieldCheck, Flame, ArrowRight, Camera, LineChart, ClipboardCheck } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Reveal from "../components/ui/Reveal";
import Dumbbell3D from "../components/home/Dumbbell3D";
import { useI18n } from "../i18n/LanguageContext";

export default function HomePage() {
  const { t } = useI18n();

  const features = [
    { Icon: ScanLine, title: t("home.f1Title"), body: t("home.f1Body") },
    { Icon: Activity, title: t("home.f2Title"), body: t("home.f2Body") },
    { Icon: LineChart, title: t("home.f3Title"), body: t("home.f3Body") },
    { Icon: Flame, title: t("home.f4Title"), body: t("home.f4Body") },
  ];

  const steps = [
    { Icon: ClipboardCheck, title: t("home.how1Title"), body: t("home.how1Body") },
    { Icon: Camera, title: t("home.how2Title"), body: t("home.how2Body") },
    { Icon: LineChart, title: t("home.how3Title"), body: t("home.how3Body") },
  ];

  const stats = [
    { value: "6", label: t("home.statsA") },
    { value: "33", label: t("home.statsB") },
    { value: "100%", label: t("home.statsC") },
  ];

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-5">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.78rem] font-semibold text-accent-strong shadow-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("home.badge")}
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
                {t("home.title1")}
                <br />
                <span className="text-gradient">{t("home.titleAccent")}</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-5 max-w-prose text-[1.05rem] leading-relaxed text-ink-2">
                {t("home.subtitle")}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button to="/onboarding" size="lg" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
                  {t("home.ctaPrimary")}
                </Button>
                <Button href="#how" variant="secondary" size="lg">
                  {t("home.ctaSecondary")}
                </Button>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-5 flex items-center gap-2 text-[0.82rem] text-ink-3">
                <ShieldCheck className="h-4 w-4 text-success" />
                {t("home.trustLine")}
              </p>
            </Reveal>
          </div>

          <Reveal delay={120} className="order-first lg:order-last">
            <Dumbbell3D className="h-[340px] sm:h-[420px]" />
          </Reveal>
        </div>

        {/* Stats strip */}
        <Reveal className="mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-4 rounded-3xl border border-line bg-surface/70 p-6 shadow-soft backdrop-blur">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-extrabold text-accent-strong sm:text-4xl">{s.value}</div>
                <div className="mt-1 text-[0.78rem] font-medium text-ink-3">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <article className="card card-hover h-full p-7">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-surface text-accent-strong">
                  <f.Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-10">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold sm:text-4xl">
            {t("home.howTitle")}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="card relative h-full p-7">
                <span className="absolute right-6 top-6 font-display text-5xl font-extrabold text-accent-surface">
                  {i + 1}
                </span>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-bg">
                  <s.Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-ink-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl bg-ink px-8 py-14 text-center shadow-float">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl animate-drift" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
            <h2 className="relative font-display text-3xl font-extrabold text-bg sm:text-4xl">
              {t("home.ctaBandTitle")}
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-ink-3">{t("home.ctaBandBody")}</p>
            <div className="relative mt-8 flex justify-center">
              <Button to="/onboarding" size="lg" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
                {t("common.getStarted")}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
