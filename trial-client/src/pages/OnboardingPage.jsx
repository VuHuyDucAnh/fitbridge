import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Sparkles, User, Ruler, Trophy,
  Target, Lock, Eye, Flame, Mars, Venus, CircleDashed,
} from "lucide-react";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import ThemeToggle from "../components/ui/ThemeToggle";
import LangToggle from "../components/ui/LangToggle";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";

function Choice({ active, onClick, icon, title, help }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`glow flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-accent bg-accent-surface"
          : "border-line-strong bg-surface hover:bg-sunken"
      }`}
    >
      {icon && (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-accent-strong text-accent-contrast" : "bg-sunken text-ink-2"}`}>
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        {help && <span className="block text-[0.82rem] text-ink-3">{help}</span>}
      </span>
      {active && <Check className="ml-auto h-5 w-5 shrink-0 text-accent-strong" />}
    </button>
  );
}

function Metric({ label, value, unit, min, max, onChange }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.82rem] font-semibold text-ink-2">{label}</span>
        <span className="font-display text-2xl font-extrabold text-ink">
          {value}
          <span className="ml-1 text-sm font-semibold text-ink-3">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        aria-label={label}
        className="mt-3 h-2 w-full cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}

export default function OnboardingPage() {
  const { t } = useI18n();
  const { completeOnboarding } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [nameErr, setNameErr] = useState("");
  const [data, setData] = useState({
    name: "",
    gender: "",
    height: 175,
    weight: 70,
    age: 24,
    level: "",
    goal: "",
    metricsPublic: false,
    beastMode: true,
  });
  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const steps = ["name", "gender", "body", "level", "goal", "privacy", "done"];
  const total = steps.length;
  const current = steps[step];

  const canNext = () => {
    if (current === "name") return data.name.trim().length > 0;
    if (current === "gender") return !!data.gender;
    if (current === "level") return !!data.level;
    if (current === "goal") return !!data.goal;
    return true;
  };

  const next = () => {
    if (current === "name" && !data.name.trim()) {
      setNameErr(t("auth.nameRequired"));
      return;
    }
    if (step < total - 1) setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    completeOnboarding(data);
    navigate("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-4 py-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[440px] w-[720px] -translate-x-1/2 rounded-full bg-accent/12 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/8 blur-[100px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 items-center py-8">
        <div className="card w-full p-6 shadow-float sm:p-9">
          {/* progress */}
          <div className="mb-7">
            <div className="mb-2 flex items-center justify-between text-[0.78rem] font-semibold text-ink-3">
              <span>{t("onboarding.stepOf", { n: step + 1, total })}</span>
              <span>{Math.round(((step + 1) / total) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-spring"
                style={{ width: `${((step + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          <div key={current} className="animate-pop">
            {current === "name" && (
              <>
                <StepHead icon={<User />} title={t("onboarding.title")} sub={t("onboarding.subtitle")} />
                <Field
                  label={t("onboarding.nameLabel")}
                  placeholder={t("onboarding.namePlaceholder")}
                  value={data.name}
                  error={nameErr}
                  autoFocus
                  maxLength={40}
                  onChange={(e) => {
                    set({ name: e.target.value });
                    if (nameErr) setNameErr("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                />
                <p className="mt-4 rounded-xl bg-accent-surface px-4 py-3 text-[0.82rem] text-accent-strong">
                  {t("onboarding.weeklyNote")}
                </p>
              </>
            )}

            {current === "gender" && (
              <>
                <StepHead icon={<User />} title={t("onboarding.genderLabel")} sub={t("onboarding.genderHelp")} />
                <div className="grid gap-3">
                  <Choice active={data.gender === "male"} onClick={() => set({ gender: "male" })} icon={<Mars className="h-5 w-5" />} title={t("onboarding.male")} />
                  <Choice active={data.gender === "female"} onClick={() => set({ gender: "female" })} icon={<Venus className="h-5 w-5" />} title={t("onboarding.female")} />
                  <Choice active={data.gender === "other"} onClick={() => set({ gender: "other" })} icon={<CircleDashed className="h-5 w-5" />} title={t("onboarding.other")} />
                </div>
              </>
            )}

            {current === "body" && (
              <>
                <StepHead icon={<Ruler />} title={t("onboarding.bodyLabel")} sub={t("onboarding.subtitle")} />
                <div className="grid gap-3">
                  <Metric label={t("onboarding.heightLabel")} value={data.height} unit="cm" min={140} max={215} onChange={(v) => set({ height: v })} />
                  <Metric label={t("onboarding.weightLabel")} value={data.weight} unit="kg" min={38} max={160} onChange={(v) => set({ weight: v })} />
                  <Metric label={t("onboarding.ageLabel")} value={data.age} unit="" min={14} max={80} onChange={(v) => set({ age: v })} />
                </div>
              </>
            )}

            {current === "level" && (
              <>
                <StepHead icon={<Trophy />} title={t("onboarding.levelLabel")} sub={t("onboarding.subtitle")} />
                <div className="grid gap-3">
                  <Choice active={data.level === "beginner"} onClick={() => set({ level: "beginner" })} icon={<span className="font-bold">1</span>} title={t("onboarding.beginner")} help={t("onboarding.beginnerHelp")} />
                  <Choice active={data.level === "intermediate"} onClick={() => set({ level: "intermediate" })} icon={<span className="font-bold">2</span>} title={t("onboarding.intermediate")} help={t("onboarding.intermediateHelp")} />
                  <Choice active={data.level === "advanced"} onClick={() => set({ level: "advanced" })} icon={<span className="font-bold">3</span>} title={t("onboarding.advanced")} help={t("onboarding.advancedHelp")} />
                </div>
              </>
            )}

            {current === "goal" && (
              <>
                <StepHead icon={<Target />} title={t("onboarding.goalLabel")} sub={t("onboarding.subtitle")} />
                <div className="grid gap-3">
                  <Choice active={data.goal === "cutting"} onClick={() => set({ goal: "cutting" })} icon={<Flame className="h-5 w-5" />} title={t("onboarding.cutting")} help={t("onboarding.cuttingHelp")} />
                  <Choice active={data.goal === "bulking"} onClick={() => set({ goal: "bulking" })} icon={<Trophy className="h-5 w-5" />} title={t("onboarding.bulking")} help={t("onboarding.bulkingHelp")} />
                  <Choice active={data.goal === "maintaining"} onClick={() => set({ goal: "maintaining" })} icon={<Target className="h-5 w-5" />} title={t("onboarding.maintaining")} help={t("onboarding.maintainingHelp")} />
                </div>
              </>
            )}

            {current === "privacy" && (
              <>
                <StepHead icon={<Lock />} title={t("onboarding.privacyLabel")} sub={t("onboarding.privacyHelp")} />
                <div className="grid gap-3">
                  <Choice active={!data.metricsPublic} onClick={() => set({ metricsPublic: false })} icon={<Lock className="h-5 w-5" />} title={t("onboarding.privateChoice")} help={t("onboarding.privacyHelp")} />
                  <Choice active={data.metricsPublic} onClick={() => set({ metricsPublic: true })} icon={<Eye className="h-5 w-5" />} title={t("onboarding.publicChoice")} />
                </div>
                <div className="mt-4">
                  <Choice
                    active={data.beastMode}
                    onClick={() => set({ beastMode: !data.beastMode })}
                    icon={<Flame className="h-5 w-5" />}
                    title={t("onboarding.coachLabel")}
                    help={t("onboarding.coachHelp")}
                  />
                </div>
              </>
            )}

            {current === "done" && (
              <div className="py-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent-strong text-accent-contrast shadow-glow">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="mt-6 font-display text-2xl font-extrabold">{t("onboarding.done")}</h2>
                <p className="mx-auto mt-2 max-w-sm text-ink-2">{t("onboarding.doneBody")}</p>
              </div>
            )}
          </div>

          {/* controls */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={step === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t("common.back")}
            </Button>
            {current === "done" ? (
              <Button onClick={finish} size="lg" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
                {t("common.start")}
              </Button>
            ) : (
              <Button onClick={next} disabled={!canNext()} rightIcon={<ArrowRight className="h-4 w-4" />}>
                {t("common.continue")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHead({ icon, title, sub }) {
  return (
    <div className="mb-6">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-accent-surface text-accent-strong">
        {icon}
      </div>
      <h1 className="font-display text-2xl font-extrabold leading-snug">{title}</h1>
      {sub && <p className="mt-1.5 text-[0.92rem] text-ink-2">{sub}</p>}
    </div>
  );
}
