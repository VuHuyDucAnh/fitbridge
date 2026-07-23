import { useState } from "react";
import { Pencil, Flame, Lock, Eye, Trophy, Ruler, Scale, Target, BarChart3 } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Field from "../components/ui/Field";
import Reveal from "../components/ui/Reveal";
import Modal from "../components/ui/Modal";
import StatusChip from "../components/ui/StatusChip";
import ContributionGraph from "../components/profile/ContributionGraph";
import ActivityRow from "../components/workout/ActivityRow";
import { ACHIEVEMENTS, FRIENDS } from "../data/mockData";
import { bmi, bmiBand, rankScore, tierForScore } from "../lib/fitness";
import { useI18n } from "../i18n/LanguageContext";
import { useApp, useStats } from "../state/AppState";

const GOAL_LABEL = {
  cutting: { en: "Cutting", vi: "Giảm mỡ" },
  bulking: { en: "Bulking", vi: "Tăng cơ" },
  maintaining: { en: "Maintaining", vi: "Duy trì" },
};
const LEVEL_LABEL = {
  beginner: { en: "Beginner", vi: "Người mới" },
  intermediate: { en: "Intermediate", vi: "Trung cấp" },
  advanced: { en: "Advanced", vi: "Nâng cao" },
};

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const { profile, updateProfile } = useApp();
  const stats = useStats();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({ name: profile.name, bio: profile.bio });

  const score = rankScore({ consistency: stats.consistency, intensity: stats.intensity });
  const tier = tierForScore(score).key;
  const myBmi = bmi(profile.weight, profile.height);
  const band = bmiBand(myBmi);
  const joined = profile.joined
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(profile.joined))
    : "—";

  const saveEdit = () => {
    updateProfile({ name: draft.name.trim() || profile.name, bio: draft.bio });
    setEditOpen(false);
  };

  const metricRows = [
    { icon: <Ruler className="h-4 w-4" />, label: t("profile.height"), value: `${profile.height} cm` },
    { icon: <Scale className="h-4 w-4" />, label: t("profile.weight"), value: `${profile.weight} kg` },
    { icon: <Target className="h-4 w-4" />, label: t("profile.goal"), value: GOAL_LABEL[profile.goal]?.[locale] || profile.goal },
    { icon: <Trophy className="h-4 w-4" />, label: t("profile.level"), value: LEVEL_LABEL[profile.level]?.[locale] || profile.level },
    { icon: <BarChart3 className="h-4 w-4" />, label: t("profile.bmi"), value: myBmi ?? "—", band },
  ];

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-5xl px-5">
        {/* Header card */}
        <Reveal>
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={profile.name} hue={profile.avatarHue} size={88} className="ring-4 ring-surface shadow-mid" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{profile.name || t("common.you")}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-surface px-2.5 py-0.5 text-[0.74rem] font-bold text-accent-strong">
                    <Trophy className="h-3.5 w-3.5" /> {t(`ranking.level.${tier}`)}
                  </span>
                </div>
                <p className="mt-1 text-[0.9rem] text-ink-2">
                  {profile.bio || (locale === "vi" ? "Chưa có giới thiệu." : "No bio yet.")}
                </p>
                <p className="mt-1 text-[0.78rem] text-ink-3">{t("profile.joined", { date: joined })}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setDraft({ name: profile.name, bio: profile.bio }); setEditOpen(true); }} leftIcon={<Pencil className="h-4 w-4" />}>
                {t("profile.editProfile")}
              </Button>
            </div>

            {/* quick stats */}
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              <QuickStat value={stats.totalWorkouts} label={t("profile.workouts")} />
              <QuickStat value={stats.streak} label={t("profile.currentStreak")} icon={<Flame className="h-4 w-4 text-accent-strong" />} />
              <QuickStat value={FRIENDS.length} label={t("profile.following")} />
            </div>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
          {/* Left: contribution + recent */}
          <div className="grid content-start gap-5">
            <Reveal>
              <div className="card p-6">
                <h2 className="font-bold">{t("profile.contributionTitle")}</h2>
                <div className="mt-3">
                  <ContributionGraph contribution={stats.contribution} />
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="card p-6">
                <h2 className="mb-4 font-bold">{t("profile.recentTitle")}</h2>
                {stats.recent.length ? (
                  <div className="grid gap-2.5">
                    {stats.recent.map((w) => (
                      <ActivityRow key={w.id} workout={w} />
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-3">{t("empty.sessions")}</p>
                )}
              </div>
            </Reveal>
          </div>

          {/* Right: metrics + achievements */}
          <div className="grid content-start gap-5">
            <Reveal>
              <div className="card p-6">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-bold">{t("profile.metricsTitle")}</h2>
                  <StatusChip
                    status={profile.metricsPublic ? "active" : "unavailable"}
                    label={profile.metricsPublic ? t("profile.metricsPublic") : t("profile.metricsPrivate")}
                  />
                </div>
                <ul className="divide-y divide-line">
                  {metricRows.map((m) => (
                    <li key={m.label} className="flex items-center justify-between py-2.5">
                      <span className="inline-flex items-center gap-2 text-[0.85rem] text-ink-2">
                        <span className="text-ink-3">{m.icon}</span> {m.label}
                      </span>
                      <span className="font-semibold text-ink">
                        {m.value}
                        {m.band && (
                          <span className="ml-1.5 text-[0.7rem] font-medium text-ink-3">
                            {t(`profile.bmi`)?.length ? bmiBandLabel(m.band, locale) : ""}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* privacy controls */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateProfile({ metricsPublic: false })}
                    aria-pressed={!profile.metricsPublic}
                    className={`glow inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[0.8rem] font-semibold ${!profile.metricsPublic ? "border-accent bg-accent-surface text-accent-strong" : "border-line-strong bg-surface text-ink-2"}`}
                  >
                    <Lock className="h-4 w-4" /> {t("onboarding.privateChoice")}
                  </button>
                  <button
                    onClick={() => updateProfile({ metricsPublic: true })}
                    aria-pressed={profile.metricsPublic}
                    className={`glow inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[0.8rem] font-semibold ${profile.metricsPublic ? "border-accent bg-accent-surface text-accent-strong" : "border-line-strong bg-surface text-ink-2"}`}
                  >
                    <Eye className="h-4 w-4" /> {t("onboarding.publicChoice")}
                  </button>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[0.82rem] text-ink-2">
                  <input
                    type="checkbox"
                    checked={profile.shareMetrics}
                    onChange={(e) => updateProfile({ shareMetrics: e.target.checked })}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  {t("profile.shareToggle")}
                </label>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="card p-6">
                <h2 className="mb-4 font-bold">{t("profile.achievementsTitle")}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {ACHIEVEMENTS.map((a) => (
                    <div key={a.id} className="flex flex-col items-center gap-1.5 rounded-2xl bg-sunken p-3 text-center">
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-[0.7rem] font-semibold leading-tight text-ink-2">{a.name[locale]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t("profile.editProfile")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveEdit}>{t("common.save")}</Button>
          </>
        }>
        <div className="space-y-4">
          <Field label={t("auth.name")} value={draft.name} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <Field label={t("profile.bio")} value={draft.bio} maxLength={120} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} />
        </div>
      </Modal>
    </PageShell>
  );
}

function QuickStat({ value, label, icon }) {
  return (
    <div className="rounded-2xl bg-sunken p-3 text-center">
      <div className="flex items-center justify-center gap-1 font-display text-2xl font-extrabold text-ink">
        {icon} {value}
      </div>
      <div className="mt-0.5 text-[0.7rem] font-medium text-ink-3">{label}</div>
    </div>
  );
}

function bmiBandLabel(band, locale) {
  const M = {
    under: { en: "underweight", vi: "thiếu cân" },
    normal: { en: "healthy", vi: "khỏe mạnh" },
    over: { en: "overweight", vi: "thừa cân" },
    obese: { en: "obese", vi: "béo phì" },
  };
  return M[band] ? M[band][locale] : "";
}
