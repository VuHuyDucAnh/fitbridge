import { calories as calcCalories } from "./fitness";
import { quoteForSeed } from "./coach";

const S = {
  fullRom: { en: "Full range of motion on most reps.", vi: "Biên độ đầy đủ ở hầu hết các rep." },
  steady: { en: "Steady, controlled tempo throughout.", vi: "Nhịp độ ổn định, có kiểm soát." },
  volume: { en: "Strong training volume this session.", vi: "Khối lượng tập tốt trong buổi này." },
  consistentForm: { en: "Consistent, clean form.", vi: "Tư thế sạch và nhất quán." },
  goodHold: { en: "Held a strong, straight line.", vi: "Giữ đường thân thẳng và vững." },

  depth: { en: "Reach full depth on every rep.", vi: "Đạt độ sâu đầy đủ ở mỗi rep." },
  hips: { en: "Keep your hips level — no sagging.", vi: "Giữ hông ngang bằng — không võng." },
  elbows: { en: "Pin your elbows to your sides.", vi: "Ép khuỷu tay sát thân." },
  tempo: { en: "Slow the lowering phase for control.", vi: "Hạ chậm lại để kiểm soát tốt hơn." },
};

const t = (k, locale) => (S[k] ? S[k][locale] || S[k].en : k);

export function buildReport({ exercise, snap, profile, locale }) {
  const isHold = exercise.detection.mode === "hold";
  const reps = snap.reps || 0;
  const holdSeconds = snap.holdSeconds || 0;
  const durationSec = Math.max(1, snap.elapsed || 0);
  const weightKg = profile.weight || 70;

  const calories = calcCalories({
    exerciseId: exercise.id,
    reps,
    seconds: isHold ? holdSeconds : 0,
    weightKg,
  });

  const sets = isHold
    ? Math.max(1, Math.round(holdSeconds / 45))
    : Math.max(1, Math.round(reps / 10));

  const faults = snap.faults || {};

  // No real work → an honest empty report, never a fabricated score.
  const noWork = isHold ? holdSeconds < 3 : reps === 0;
  if (noWork) {
    return {
      exerciseId: exercise.id,
      reps: 0,
      sets: 0,
      calories: 0,
      formScore: 0,
      durationSec: Math.round(durationSec),
      holdSeconds: 0,
      noWork: true,
      good: [],
      fix: [
        locale === "vi"
          ? "Chưa ghi nhận rep nào — đứng trọn khung hình, đủ sáng, rồi thử lại."
          : "No reps were detected — get your whole body in frame with good light, then try again.",
      ],
      next:
        locale === "vi"
          ? "Bắt đầu lại và thực hiện vài rep để mình phân tích tư thế nhé."
          : "Start again and perform a few reps so the coach can analyse your form.",
      quote: quoteForSeed(locale, 1),
    };
  }

  let formScore = snap.formScore;
  if (formScore == null) {
    const penalties = (faults.depth || 0) * 0.15 + (faults.hips || 0) * 0.2 + (faults.elbows || 0) * 0.15;
    formScore = +Math.max(5, 9.2 - penalties).toFixed(1);
  }

  // What went well / to improve
  const good = [];
  const fix = [];
  const total = Math.max(1, reps || sets);

  if (formScore >= 8.5) good.push(t("consistentForm", locale));
  if (isHold && holdSeconds >= 30) good.push(t("goodHold", locale));
  if (!isHold && reps >= 15) good.push(t("volume", locale));
  if ((faults.depth || 0) / total < 0.25 && !isHold) good.push(t("fullRom", locale));

  if ((faults.depth || 0) / total >= 0.25) fix.push(t("depth", locale));
  if ((faults.hips || 0) > 3) fix.push(t("hips", locale));
  if ((faults.elbows || 0) > 3) fix.push(t("elbows", locale));

  if (good.length === 0) good.push(t("steady", locale));
  if (fix.length === 0) fix.push(t("tempo", locale));

  // Next session: gentle progressive overload.
  const next = isHold
    ? locale === "vi"
      ? `Giữ lâu hơn ~10 giây (mục tiêu ${Math.round(holdSeconds * 1.15) || 45}s) với cùng chất lượng.`
      : `Hold ~10s longer (aim for ${Math.round(holdSeconds * 1.15) || 45}s) at the same quality.`
    : locale === "vi"
      ? `Tăng lên ${Math.round(reps * 1.12) || 12} rep, giữ nguyên chất lượng động tác.`
      : `Bump to ${Math.round(reps * 1.12) || 12} reps while keeping the same movement quality.`;

  const quote = quoteForSeed(locale, reps + Math.round(durationSec));

  return {
    exerciseId: exercise.id,
    reps,
    sets,
    calories,
    formScore,
    durationSec: Math.round(durationSec),
    holdSeconds: Math.round(holdSeconds),
    good,
    fix,
    next,
    quote,
  };
}
