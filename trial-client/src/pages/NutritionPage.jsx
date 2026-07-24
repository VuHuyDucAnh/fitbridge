import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Camera, Trash2, Sparkles, Loader2, Bell, UtensilsCrossed, Flame } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Reveal from "../components/ui/Reveal";
import { Ring } from "../components/charts/Charts";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";
import {
  SLOTS,
  dailyKcalTarget,
  macroTargets,
  analyzeMealPhoto,
  fileToDataUrl,
  todayKey,
  shiftDay,
} from "../lib/nutrition";

const SLOT_ICON = { breakfast: "🌅", lunch: "🥗", dinner: "🍽️", snack: "🍎" };

export default function NutritionPage() {
  const { t, locale } = useI18n();
  const { profile, meals, addMeal, deleteMeal, uploadMealPhoto } = useApp();

  const [day, setDay] = useState(todayKey());
  const [modalSlot, setModalSlot] = useState(null);

  const target = dailyKcalTarget(profile);
  const macroT = macroTargets(target, profile.goal);

  const dayMeals = useMemo(() => meals.filter((m) => m.eatenOn === day), [meals, day]);
  const totals = useMemo(
    () =>
      dayMeals.reduce(
        (a, m) => ({
          kcal: a.kcal + m.kcal,
          protein: a.protein + m.protein,
          carbs: a.carbs + m.carbs,
          fat: a.fat + m.fat,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [dayMeals]
  );

  // 7-day calorie history (real meals) for the mini chart.
  const week = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = shiftDay(todayKey(), -i);
      const kcal = meals.filter((m) => m.eatenOn === key).reduce((s, m) => s + m.kcal, 0);
      days.push({ key, kcal });
    }
    return days;
  }, [meals]);
  const weekMax = Math.max(target, ...week.map((d) => d.kcal), 1);

  const dayLabel = new Date(day + "T12:00:00").toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const isToday = day === todayKey();

  const requestReminder = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("FitBridge", {
        body: locale === "vi" ? "Đã bật nhắc nhở ghi bữa ăn. Hẹn gặp vào bữa tối!" : "Meal reminders on. See you at dinner!",
      });
    }
  };

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-4xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("nutrition.title")}</h1>
              <p className="mt-1.5 text-ink-2">{t("nutrition.subtitle")}</p>
            </div>
            <button
              onClick={requestReminder}
              className="glow inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[0.85rem] font-semibold text-ink-2 hover:bg-sunken"
            >
              <Bell className="h-4 w-4" /> {t("nutrition.remind")}
            </button>
          </div>
        </Reveal>

        {/* Day navigator */}
        <Reveal>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-line bg-sunken px-3 py-2">
            <button onClick={() => setDay((d) => shiftDay(d, -1))} aria-label={t("common.back")} className="glow grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="font-display font-extrabold text-ink">{isToday ? t("nutrition.today") : dayLabel}</div>
              {!isToday && <button onClick={() => setDay(todayKey())} className="glow text-[0.76rem] font-semibold text-accent-strong">{t("nutrition.jumpToday")}</button>}
            </div>
            <button
              onClick={() => setDay((d) => shiftDay(d, 1))}
              disabled={isToday}
              aria-label={t("common.next")}
              className="glow grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </Reveal>

        {/* Daily summary */}
        <Reveal>
          <div className="card mt-5 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto">
              <Ring
                value={Math.min(100, target ? (totals.kcal / target) * 100 : 0)}
                size={132}
                label={`${Math.round(totals.kcal)}`}
                sublabel={`/ ${target} ${t("common.kcal")}`}
              />
            </div>
            <div className="grid gap-3">
              <MacroBar label={t("nutrition.protein")} value={totals.protein} target={macroT.protein} />
              <MacroBar label={t("nutrition.carbs")} value={totals.carbs} target={macroT.carbs} />
              <MacroBar label={t("nutrition.fat")} value={totals.fat} target={macroT.fat} />
              <p className="text-[0.8rem] text-ink-3">
                {target - Math.round(totals.kcal) >= 0
                  ? t("nutrition.remaining", { n: target - Math.round(totals.kcal) })
                  : t("nutrition.over", { n: Math.round(totals.kcal) - target })}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Meal slots */}
        <div className="mt-6 space-y-4">
          {SLOTS.map((slot) => {
            const slotMeals = dayMeals.filter((m) => m.slot === slot);
            const slotKcal = slotMeals.reduce((s, m) => s + m.kcal, 0);
            return (
              <section key={slot} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden="true">{SLOT_ICON[slot]}</span>
                    <h2 className="font-display text-lg font-extrabold">{t(`nutrition.slot.${slot}`)}</h2>
                    {slotKcal > 0 && <span className="text-[0.82rem] font-semibold text-ink-3">· {Math.round(slotKcal)} {t("common.kcal")}</span>}
                  </div>
                  <button onClick={() => setModalSlot(slot)} className="glow inline-flex items-center gap-1.5 rounded-full bg-accent-surface px-3 py-1.5 text-[0.8rem] font-bold text-accent-strong">
                    <Plus className="h-4 w-4" /> {t("nutrition.add")}
                  </button>
                </div>

                {slotMeals.length === 0 ? (
                  <p className="mt-3 text-[0.86rem] text-ink-3">{t("nutrition.slotEmpty")}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {slotMeals.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl bg-sunken p-3">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface text-ink-3">
                            <UtensilsCrossed className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold text-ink">
                            <span className="truncate">{m.title || (m.items[0] ?? t(`nutrition.slot.${slot}`))}</span>
                            {m.ai && <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-strong" title="AI estimate" />}
                          </div>
                          <div className="truncate text-[0.78rem] text-ink-3">
                            {m.items.length ? m.items.join(", ") : `${m.protein}P · ${m.carbs}C · ${m.fat}F`}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-display font-extrabold text-accent-strong">{Math.round(m.kcal)}</div>
                          <button onClick={() => deleteMeal(m.id)} aria-label={t("common.remove")} className="glow text-ink-3 hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* Weekly chart */}
        <Reveal>
          <section className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Flame className="h-5 w-5 text-accent" /> {t("nutrition.week")}
            </h2>
            <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
              {week.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-accent/80"
                      style={{ height: `${Math.max(2, (d.kcal / weekMax) * 100)}%` }}
                      title={`${Math.round(d.kcal)} ${t("common.kcal")}`}
                    />
                  </div>
                  <span className="text-[0.68rem] text-ink-3">
                    {new Date(d.key + "T12:00:00").toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      {modalSlot && (
        <AddMealModal
          slot={modalSlot}
          day={day}
          onClose={() => setModalSlot(null)}
          addMeal={addMeal}
          uploadMealPhoto={uploadMealPhoto}
        />
      )}
    </PageShell>
  );
}

function MacroBar({ label, value, target }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[0.8rem]">
        <span className="font-semibold text-ink-2">{label}</span>
        <span className="text-ink-3">{Math.round(value)} / {target} g</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AddMealModal({ slot, day, onClose, addMeal, uploadMealPhoto }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", items: "", kcal: "", protein: "", carbs: "", fat: "", ai: false });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setNotice("");
    const dataUrl = await fileToDataUrl(f);
    setPreview(dataUrl);
    setAnalyzing(true);
    const res = await analyzeMealPhoto(dataUrl);
    setAnalyzing(false);
    if (res.configured && (res.kcal || res.items?.length)) {
      setForm((prev) => ({
        ...prev,
        items: (res.items || []).join(", "),
        title: prev.title || (res.items?.[0] ?? ""),
        kcal: String(res.kcal || ""),
        protein: String(res.protein || ""),
        carbs: String(res.carbs || ""),
        fat: String(res.fat || ""),
        ai: true,
      }));
      setNotice(t("nutrition.aiFilled"));
    } else {
      setNotice(t("nutrition.aiOff"));
    }
  };

  const save = async () => {
    setSaving(true);
    let photoUrl = "";
    if (file) {
      const up = await uploadMealPhoto(file);
      if (up.url) photoUrl = up.url;
    }
    await addMeal({
      eatenOn: day,
      slot,
      title: form.title.trim(),
      items: form.items.split(",").map((s) => s.trim()).filter(Boolean),
      kcal: Number(form.kcal) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      ai: form.ai,
      photoUrl,
    });
    setSaving(false);
    onClose();
  };

  const num = (k, label) => (
    <label className="flex-1">
      <span className="mb-1 block text-[0.76rem] font-semibold text-ink-2">{label}</span>
      <input type="number" min={0} value={form[k]} onChange={set(k)} className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[0.9rem] text-ink outline-none focus:border-accent" />
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("nutrition.add")} · ${t(`nutrition.slot.${slot}`)}`}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">{t("common.cancel")}</Button>
          <Button onClick={save} loading={saving} disabled={!form.kcal && !form.title} className="flex-1">{t("common.save")}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Photo → AI estimate */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="glow grid w-full place-items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-sunken py-6 text-ink-2 hover:bg-surface"
          >
            {preview ? (
              <img src={preview} alt="" className="max-h-40 rounded-xl object-contain" />
            ) : (
              <>
                <Camera className="h-7 w-7 text-accent" />
                <span className="text-[0.86rem] font-semibold">{t("nutrition.snap")}</span>
                <span className="text-[0.76rem] text-ink-3">{t("nutrition.snapHint")}</span>
              </>
            )}
          </button>
          {analyzing && (
            <p className="mt-2 flex items-center gap-2 text-[0.82rem] font-semibold text-accent-strong">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("nutrition.analyzing")}
            </p>
          )}
          {notice && !analyzing && <p className="mt-2 text-[0.82rem] text-ink-3">{notice}</p>}
        </div>

        <label className="block">
          <span className="mb-1 block text-[0.8rem] font-semibold text-ink-2">{t("nutrition.mealName")}</span>
          <input value={form.title} onChange={set("title")} placeholder={t("nutrition.mealNamePlaceholder")} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.92rem] text-ink outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.8rem] font-semibold text-ink-2">{t("nutrition.items")}</span>
          <input value={form.items} onChange={set("items")} placeholder={t("nutrition.itemsPlaceholder")} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.92rem] text-ink outline-none focus:border-accent" />
        </label>
        <div className="flex gap-2">
          {num("kcal", t("common.kcal"))}
          {num("protein", "P (g)")}
          {num("carbs", "C (g)")}
          {num("fat", "F (g)")}
        </div>
      </div>
    </Modal>
  );
}
