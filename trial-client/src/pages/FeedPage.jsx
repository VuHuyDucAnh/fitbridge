import { useEffect, useState } from "react";
import { Heart, Send, Dumbbell, Route as RouteIcon, Trash2, Globe, Users, Loader2, MessageSquareText } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Reveal from "../components/ui/Reveal";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";
import { getExercise } from "../data/exercises";
import { formatDuration } from "../lib/fitness";
import { distanceValue, formatPace, paceSecPerUnit } from "../lib/geo";
import { fetchFeed, createPost, deletePost, toggleKudos } from "../lib/social";

function timeAgo(iso, locale) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const vi = locale === "vi";
  if (s < 60) return vi ? "vừa xong" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return vi ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return vi ? `${d} ngày trước` : `${d}d ago`;
}

export default function FeedPage() {
  const { t, locale } = useI18n();
  const { auth, profile, workouts, runs } = useApp();
  const userId = auth.userId;

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [attach, setAttach] = useState("none"); // none | workout | run
  const [posting, setPosting] = useState(false);

  const latestWorkout = workouts[0];
  const latestRun = runs[0];

  const load = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const data = await fetchFeed(userId);
    setFeed(data);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const buildStat = () => {
    if (attach === "workout" && latestWorkout) {
      const ex = getExercise(latestWorkout.exerciseId);
      return {
        kind: "workout",
        refId: latestWorkout.id,
        stat: {
          exercise: ex?.name[locale] || latestWorkout.exerciseId,
          reps: latestWorkout.reps,
          sets: latestWorkout.sets,
          form: latestWorkout.formScore,
          calories: latestWorkout.calories,
        },
      };
    }
    if (attach === "run" && latestRun) {
      return {
        kind: "run",
        refId: latestRun.id,
        stat: {
          distanceKm: +(latestRun.distanceM / 1000).toFixed(2),
          durationSec: latestRun.durationSec,
          paceSec: latestRun.avgPaceSec,
          calories: latestRun.calories,
        },
      };
    }
    return { kind: "text", refId: "", stat: {} };
  };

  const submit = async () => {
    if (!userId) return;
    const { kind, refId, stat } = buildStat();
    if (kind === "text" && !caption.trim()) return;
    setPosting(true);
    const { data } = await createPost({ userId, kind, refId, caption: caption.trim(), stat, visibility });
    setPosting(false);
    if (data) {
      setCaption("");
      setAttach("none");
      load();
    }
  };

  const onKudos = async (post) => {
    const on = !post.kudoedByMe;
    setFeed((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, kudoedByMe: on, kudos: p.kudos + (on ? 1 : -1) } : p))
    );
    await toggleKudos(post.id, userId, on);
  };

  const onDelete = async (post) => {
    setFeed((prev) => prev.filter((p) => p.id !== post.id));
    await deletePost(post.id);
  };

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-2xl px-5">
        <Reveal>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("feed.title")}</h1>
          <p className="mt-1.5 text-ink-2">{t("feed.subtitle")}</p>
        </Reveal>

        {/* Composer */}
        <Reveal>
          <div className="card mt-6 p-5">
            <div className="flex gap-3">
              <Avatar name={profile.name} hue={profile.avatarHue} src={profile.avatarUrl} size={40} />
              <div className="flex-1">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder={t("feed.placeholder")}
                  className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.92rem] text-ink outline-none focus:border-accent"
                />
                {/* attach latest activity */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAttach(attach === "workout" ? "none" : "workout")}
                    disabled={!latestWorkout}
                    className={`glow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold disabled:opacity-40 ${attach === "workout" ? "bg-accent-strong text-accent-contrast" : "bg-sunken text-ink-2"}`}
                  >
                    <Dumbbell className="h-3.5 w-3.5" /> {t("feed.attachWorkout")}
                  </button>
                  <button
                    onClick={() => setAttach(attach === "run" ? "none" : "run")}
                    disabled={!latestRun}
                    className={`glow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold disabled:opacity-40 ${attach === "run" ? "bg-accent-strong text-accent-contrast" : "bg-sunken text-ink-2"}`}
                  >
                    <RouteIcon className="h-3.5 w-3.5" /> {t("feed.attachRun")}
                  </button>
                  <button
                    onClick={() => setVisibility(visibility === "public" ? "followers" : "public")}
                    className="glow ml-auto inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-[0.8rem] font-semibold text-ink-2"
                  >
                    {visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {visibility === "public" ? t("feed.public") : t("feed.followers")}
                  </button>
                  <Button size="sm" onClick={submit} loading={posting} leftIcon={<Send className="h-4 w-4" />}>
                    {t("feed.share")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Feed */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent-strong" />
            </div>
          ) : feed.length === 0 ? (
            <div className="card grid place-items-center p-12 text-center">
              <MessageSquareText className="h-9 w-9 text-ink-3" />
              <p className="mt-3 max-w-xs text-ink-2">{t("feed.empty")}</p>
            </div>
          ) : (
            feed.map((post) => (
              <article key={post.id} className="card p-5">
                <header className="flex items-center gap-3">
                  <Avatar name={post.authorName} hue={post.authorHue} src={post.authorAvatar} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-extrabold text-ink">{post.authorName}</div>
                    <div className="text-[0.76rem] text-ink-3">{timeAgo(post.createdAt, locale)}</div>
                  </div>
                  {post.isMine && (
                    <button onClick={() => onDelete(post)} aria-label={t("common.remove")} className="glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </header>

                {post.caption && <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">{post.caption}</p>}

                {post.kind === "workout" && post.stat?.exercise && (
                  <StatStrip
                    icon={<Dumbbell className="h-4 w-4" />}
                    title={post.stat.exercise}
                    items={[
                      `${post.stat.reps} ${t("common.reps")}`,
                      `${post.stat.sets} ${t("coach.completedSets").toLowerCase()}`,
                      `${t("coach.formScore")} ${post.stat.form}/10`,
                      `${post.stat.calories} ${t("common.kcal")}`,
                    ]}
                  />
                )}
                {post.kind === "run" && post.stat?.distanceKm != null && (
                  <StatStrip
                    icon={<RouteIcon className="h-4 w-4" />}
                    title={t("run.title")}
                    items={[
                      `${distanceValue(post.stat.distanceKm * 1000, "km").toFixed(2)} km`,
                      formatDuration(post.stat.durationSec),
                      `${formatPace(post.stat.paceSec || paceSecPerUnit(post.stat.distanceKm * 1000, post.stat.durationSec, "km"))}/km`,
                      `${post.stat.calories} ${t("common.kcal")}`,
                    ]}
                  />
                )}

                <footer className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => onKudos(post)}
                    className={`glow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.85rem] font-semibold ${post.kudoedByMe ? "bg-accent-surface text-accent-strong" : "text-ink-2 hover:bg-sunken"}`}
                  >
                    <Heart className={`h-4 w-4 ${post.kudoedByMe ? "fill-accent-strong" : ""}`} /> {post.kudos}
                  </button>
                </footer>
              </article>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}

function StatStrip({ icon, title, items }) {
  return (
    <div className="mt-3 rounded-2xl border border-line bg-sunken p-4">
      <div className="flex items-center gap-2 text-[0.82rem] font-bold uppercase tracking-wide text-accent-strong">
        {icon} {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.88rem] font-semibold text-ink">
        {items.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}
