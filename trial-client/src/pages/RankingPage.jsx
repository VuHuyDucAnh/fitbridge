import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Swords, Share2, Camera, Trophy, Dumbbell, ArrowRight, Activity } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Reveal from "../components/ui/Reveal";
import Segmented from "../components/ui/Segmented";
import Modal from "../components/ui/Modal";
import { Ring } from "../components/charts/Charts";
import BodyHeatmap from "../components/ranking/BodyHeatmap";
import Leaderboard from "../components/ranking/Leaderboard";
import { exercisesForMuscle, muscleName } from "../data/muscles";
import { DIFFICULTY_LABEL } from "../data/exercises";
import { rankScore, tierForScore } from "../lib/fitness";
import { useI18n } from "../i18n/LanguageContext";
import { useApp, useStats } from "../state/AppState";
import { supabase } from "../lib/supabase";
import { fetchFollowing, toggleFollow } from "../lib/social";

export default function RankingPage() {
  const { t, locale } = useI18n();
  const { profile, auth, updateProfile } = useApp();
  const stats = useStats();
  const [board, setBoard] = useState("global");
  const [muscle, setMuscle] = useState("chest");
  const [shareOpen, setShareOpen] = useState(false);

  const myScore = rankScore({ consistency: stats.consistency, intensity: stats.intensity });
  const myTier = tierForScore(myScore).key;
  const [publicAthletes, setPublicAthletes] = useState([]);
  const [following, setFollowing] = useState(new Set());

  // Real leaderboard: public profiles from the database — no invented athletes.
  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("id,name,avatar_hue,avatar_url,score,streak")
      .eq("metrics_public", true)
      .order("score", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (active && data) setPublicAthletes(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Load who this user already follows.
  useEffect(() => {
    if (!auth.userId) return;
    let active = true;
    fetchFollowing(auth.userId).then((set) => active && setFollowing(set));
    return () => { active = false; };
  }, [auth.userId]);

  const onToggleFollow = async (id) => {
    if (!auth.userId) return;
    const on = !following.has(id);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
    await toggleFollow(auth.userId, id, on);
  };

  // Keep this user's public stats current so others see real numbers.
  useEffect(() => {
    if (!auth.signedIn) return;
    if (profile.score !== myScore || profile.streak !== stats.streak) {
      updateProfile({ score: myScore, streak: stats.streak });
    }
  }, [auth.signedIn, myScore, stats.streak, profile.score, profile.streak, updateProfile]);

  const rows = useMemo(() => {
    const you = {
      id: "you",
      name: profile.name || t("common.you"),
      handle: (profile.name || "you").toLowerCase().replace(/\s+/g, ""),
      streak: stats.streak,
      score: myScore,
      hue: profile.avatarHue,
      avatarUrl: profile.avatarUrl,
      tier: myTier,
      isYou: true,
    };
    if (board === "friends") return [you];
    const others = publicAthletes
      .filter((p) => p.name)
      .map((p) => ({
        id: p.id,
        name: p.name,
        handle: p.name.toLowerCase().replace(/\s+/g, ""),
        streak: p.streak || 0,
        score: p.score || 0,
        hue: p.avatar_hue ?? 22,
        avatarUrl: p.avatar_url ?? null,
        tier: tierForScore(p.score || 0).key,
      }));
    const merged = [you, ...others.filter((o) => o.id !== auth.userId)];
    return merged.sort((a, b) => b.score - a.score);
  }, [board, profile, stats.streak, myScore, myTier, t, publicAthletes, auth.userId]);

  const suggestions = exercisesForMuscle(muscle);

  const share = async () => {
    const text =
      locale === "vi"
        ? `Tôi đang ở hạng ${t(`ranking.level.${myTier}`)} trên FitBridge với chuỗi ${stats.streak} ngày! 💪`
        : `I'm ${t(`ranking.level.${myTier}`)} on FitBridge with a ${stats.streak}-day streak! 💪`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "FitBridge", text });
        return;
      } catch { /* cancelled */ }
    }
    setShareOpen(true);
  };

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("ranking.title")}</h1>
              <p className="mt-1.5 text-ink-2">{t("ranking.subtitle")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={share} leftIcon={<Camera className="h-4 w-4" />}>
                {t("ranking.shareStory")}
              </Button>
              <Button size="sm" onClick={share} leftIcon={<Share2 className="h-4 w-4" />}>
                {t("ranking.shareProgress")}
              </Button>
            </div>
          </div>
        </Reveal>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_22rem]">
          {/* Heatmap */}
          <Reveal>
            <div className="card p-6">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold">{t("ranking.heatTitle")}</h2>
                <div className="flex items-center gap-3">
                  <MiniStat label={t("ranking.consistency")} value={`${stats.consistency}%`} />
                  <MiniStat label={t("ranking.intensity")} value={`${stats.intensity}%`} />
                </div>
              </div>
              <p className="text-[0.85rem] text-ink-3">{t("ranking.heatSubtitle")}</p>

              <div className="mt-4">
                <BodyHeatmap muscleVolume={stats.muscleVolume} maxMuscle={stats.maxMuscle} selected={muscle} onSelect={setMuscle} />
              </div>

              {/* Suggestions */}
              <div className="mt-6 rounded-2xl bg-sunken p-5">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4.5 w-4.5 text-accent-strong" />
                  <h3 className="font-bold">{t("ranking.suggestFor", { muscle: muscleName(muscle, locale) })}</h3>
                </div>
                <p className="mt-1 text-[0.82rem] text-ink-3">{t("ranking.tapMuscle")}</p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {suggestions.length ? (
                    suggestions.map((ex) => (
                      <Link
                        key={ex.id}
                        to={`/coach?ex=${ex.id}`}
                        className="glow group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-bg"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-surface text-accent-strong">
                          <Dumbbell className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{ex.name[locale]}</span>
                          <span className="block text-[0.74rem] text-ink-3">{DIFFICULTY_LABEL[ex.difficulty][locale]}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ))
                  ) : (
                    <p className="text-[0.85rem] text-ink-3">—</p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right column */}
          <div className="grid content-start gap-5">
            <Reveal>
              <div className="card p-6 text-center">
                <Ring value={myScore} size={132} label={myScore} sublabel={t("ranking.score")} />
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-surface px-3 py-1 text-[0.82rem] font-bold text-accent-strong">
                  <Trophy className="h-4 w-4" /> {t(`ranking.level.${myTier}`)}
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold">{t("ranking.leaderboard")}</h2>
                  <Segmented
                    ariaLabel={t("ranking.leaderboard")}
                    value={board}
                    onChange={setBoard}
                    options={[
                      { value: "global", label: t("ranking.global") },
                      { value: "friends", label: t("ranking.friends") },
                    ]}
                  />
                </div>
                <Leaderboard rows={rows} following={following} onToggleFollow={onToggleFollow} />
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="card relative overflow-hidden p-6">
                <Activity className="absolute -right-3 -top-3 h-20 w-20 text-accent-surface" />
                <h2 className="relative font-bold">{t("ranking.inviteTitle")}</h2>
                <p className="relative mt-1 text-[0.88rem] text-ink-2">{t("ranking.inviteBody")}</p>
                <div className="relative mt-4 flex gap-2">
                  <Button size="sm" onClick={share} leftIcon={<UserPlus className="h-4 w-4" />}>{t("ranking.addFriend")}</Button>
                  <Button size="sm" variant="secondary" onClick={share} leftIcon={<Swords className="h-4 w-4" />}>{t("ranking.challenge")}</Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t("ranking.shareProgress")}
        footer={<Button onClick={() => setShareOpen(false)}>{t("common.close")}</Button>}>
        <div className="rounded-2xl bg-ink p-6 text-center text-bg">
          <Trophy className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-2 font-display text-xl font-extrabold text-bg">{t(`ranking.level.${myTier}`)}</p>
          <p className="text-ink-3">{profile.name} · {stats.streak} {locale === "vi" ? "ngày" : "days"} · {myScore} {t("ranking.score").toLowerCase()}</p>
        </div>
        <p className="mt-4 text-center text-[0.85rem] text-ink-3">
          {locale === "vi" ? "Chụp lại hoặc dùng nút chia sẻ của thiết bị để đăng lên story." : "Screenshot this or use your device share sheet to post it to a story."}
        </p>
      </Modal>
    </PageShell>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="text-right">
      <div className="font-display text-lg font-extrabold text-accent-strong">{value}</div>
      <div className="text-[0.68rem] font-medium text-ink-3">{label}</div>
    </div>
  );
}
