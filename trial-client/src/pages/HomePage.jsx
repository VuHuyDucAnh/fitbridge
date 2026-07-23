import { useState } from "react";
import { Activity, ScanLine, ShieldCheck, Flame, ArrowRight, Camera, LineChart, ClipboardCheck } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Reveal from "../components/ui/Reveal";
import PoseProof from "../components/home/PoseProof";
import { LogoMark } from "../components/ui/Logo";
import { useI18n } from "../i18n/LanguageContext";

/* Real demo footage: drops in automatically when the file exists at
   public/media/demo-pushups.mp4 (landscape phone video). The frame takes the
   video's own aspect ratio, so nothing is ever letterboxed or cropped. */
function DemoVideo() {
  const { t } = useI18n();
  const [available, setAvailable] = useState(true);
  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <Reveal>
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{t("home.demoTitle")}</h2>
        <p className="mt-2 max-w-prose text-ink-2">{t("home.demoBody")}</p>
      </Reveal>
      <Reveal delay={80}>
        <figure className="mt-6 overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-black shadow-float">
          {available ? (
            <video
              className="block h-auto w-full"
              controls
              playsInline
              preload="metadata"
              onError={() => setAvailable(false)}
            >
              {/* Any of these filenames in public/media/ will play automatically */}
              <source src="/media/demo-pushups.mp4" type="video/mp4" />
              <source src="/media/demo.mp4" type="video/mp4" />
              <source src="/media/pushups.mp4" type="video/mp4" />
              <source src="/media/demo-pushups.mov" type="video/quicktime" />
              <source src="/media/demo.webm" type="video/webm" />
            </video>
          ) : (
            /* Elegant placeholder frame until the real footage is dropped in */
            <div className="relative grid aspect-video w-full place-items-center bg-[#0d0d0d]">
              <div className="pointer-events-none absolute inset-0 bg-accent/10 blur-[80px]" aria-hidden="true" />
              <div className="relative text-center">
                <span className="glass mx-auto grid h-16 w-16 place-items-center rounded-full">
                  <Camera className="h-7 w-7 text-accent" />
                </span>
                <p className="mt-4 font-display text-lg font-extrabold text-white">{t("home.demoSoon")}</p>
                <p className="mt-1 text-[0.85rem] text-white/50">{t("home.demoSoonBody")}</p>
              </div>
            </div>
          )}
        </figure>
      </Reveal>
    </section>
  );
}

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

  return (
    <PageShell>
      {/* Hero — the pose-proof panel is the point: the camera sees your form. */}
      <section className="relative overflow-hidden px-5">
        <div className="pointer-events-none absolute -top-32 right-0 h-[520px] w-[620px] rounded-full bg-accent/12 blur-[130px] animate-drift" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div>
            <Reveal>
              {/* TalkBridge-style brand pill: the real logo mark leads the badge */}
              <span className="glass inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[0.78rem] font-bold text-accent-strong">
                <LogoMark size={22} />
                {t("home.badge")}
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[4.75rem]">
                {t("home.title1")}
                <br />
                <span className="text-accent">{t("home.titleAccent")}</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-prose text-[1.0625rem] leading-relaxed text-ink-2">
                {t("home.subtitle")}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Button to="/register" size="lg" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
                  {t("home.ctaPrimary")}
                </Button>
                <a href="#how" className="glow rounded-lg px-1 text-[0.95rem] font-semibold text-ink underline-offset-4 hover:underline">
                  {t("home.ctaSecondary")}
                </a>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-6 flex items-center gap-2 text-[0.82rem] text-ink-3">
                <ShieldCheck className="h-4 w-4 text-success" />
                {t("home.trustLine")}
              </p>
            </Reveal>

          </div>

          <Reveal delay={140}>
            <PoseProof />
          </Reveal>
        </div>
      </section>

      {/* Real demo video (renders only when the file exists) */}
      <DemoVideo />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-20">
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

      {/* How it works — a pasted-paper editorial band (Vox-style, papercut) */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-10">
        <Reveal>
          <div className="paper relative overflow-hidden rounded-[var(--r-xl)] px-6 py-12 sm:px-12">
            {/* torn paper accent strips */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rotate-12 rounded-[var(--r-lg)]" style={{ background: "var(--paper-3)" }} aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 -rotate-6 rounded-full" style={{ background: "var(--paper-2)" }} aria-hidden="true" />

            <div className="relative">
              <span className="inline-block -rotate-1 rounded-[var(--r-sm)] bg-accent px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-accent-contrast shadow-[var(--paper-lift)]">
                {t("home.badge")}
              </span>
              <h2 className="mt-5 max-w-2xl font-display text-[2rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-[color:var(--paper-ink)] sm:text-[2.75rem]">
                {t("home.howTitle")}
              </h2>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {steps.map((s, i) => (
                  <Reveal key={s.title} delay={i * 90}>
                    <article
                      className="paper-card h-full p-6"
                      style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1.2}deg)` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-display text-2xl font-extrabold text-accent-contrast shadow-[var(--paper-lift)]">
                          {i + 1}
                        </span>
                        <s.Icon className="h-6 w-6 text-[color:var(--paper-ink-2)]" />
                      </div>
                      <h3 className="mt-4 font-display text-xl font-extrabold text-[color:var(--paper-ink)]">{s.title}</h3>
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--paper-ink-2)]">{s.body}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-accent/25 bg-raised px-8 py-14 text-center shadow-float">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/25 blur-3xl animate-drift" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
            <h2 className="relative font-display text-3xl font-extrabold text-ink sm:text-4xl">
              {t("home.ctaBandTitle")}
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-ink-2">{t("home.ctaBandBody")}</p>
            <div className="relative mt-8 flex justify-center">
              <Button to="/register" size="lg" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
                {t("common.getStarted")}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
