import { calories as calcCalories } from "./fitness";
import { quoteForSeed } from "./coach";

/* Session grading.
   The score is a weighted rubric over five independent dimensions rather than
   one number, because "how good was that set" is not one question. The bands
   are deliberately demanding: clearing the rep-counting thresholds is what
   makes a rep *count*, not what makes it *good*, so a set that merely counts
   lands in the 50s and 80+ requires genuinely textbook execution. */

const L = (en, vi) => ({ en, vi });
const pick = (o, locale) => (o ? o[locale] || o.en : "");

/* Full, textbook range of motion per movement, in degrees at the tracked joint.
   Noticeably wider than the flex/extend counting thresholds. */
const IDEAL_ROM = { pushup: 95, squat: 105, curl: 120, pullup: 110 };
const LOCKOUT_TARGET = { pushup: 173, squat: 172, curl: 165, pullup: 172 };

const DIM_LABEL = {
  depth: L("Range of motion", "Biên độ động tác"),
  tempo: L("Tempo control", "Kiểm soát nhịp"),
  consistency: L("Rep consistency", "Độ đều giữa các rep"),
  alignment: L("Alignment", "Căn chỉnh tư thế"),
  lockout: L("Lockout", "Khoá hết tầm"),
  duration: L("Time under tension", "Thời gian chịu lực"),
  line: L("Body line", "Đường thân"),
  stability: L("Stability", "Độ ổn định"),
  tracking: L("Tracking quality", "Chất lượng nhận diện"),
};

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/* ---------------- advice library ---------------- */
/* Keyed by dimension, then by formKey with a shared fallback. Several entries
   per bucket so a report reads differently session to session. */
const TIPS = {
  depth: {
    pushup: [
      L("Lower until your chest is a fist's height from the floor — you are stopping short of that.",
        "Hạ tới khi ngực cách sàn khoảng một nắm tay — bạn đang dừng sớm hơn mức đó."),
      L("Think 'chest to the floor', not 'elbows to 90' — the last few degrees are where the pecs actually load.",
        "Nghĩ 'ngực chạm sàn' thay vì 'khuỷu 90 độ' — vài độ cuối mới là lúc ngực thật sự chịu lực."),
    ],
    squat: [
      L("Break parallel: the hip crease should drop below the top of the knee.",
        "Hạ qua song song: nếp hông phải xuống thấp hơn đỉnh gối."),
      L("Sit back and down between your feet rather than dipping straight down.",
        "Đẩy hông ra sau rồi hạ xuống giữa hai bàn chân, đừng thả thẳng người xuống."),
    ],
    curl: [
      L("Let the arm straighten fully at the bottom — cutting the bottom off halves the biceps' work.",
        "Duỗi thẳng hẳn tay ở dưới — cắt đoạn dưới là mất một nửa công của cơ tay trước."),
      L("Curl until the forearm nearly touches the biceps, then squeeze for a beat.",
        "Cuốn tới khi cẳng tay gần chạm bắp tay rồi siết giữ một nhịp."),
    ],
    pullup: [
      L("Finish with the chin clearly over the bar, not level with it.",
        "Kết thúc khi cằm vượt hẳn qua xà, không phải ngang xà."),
      L("Start each rep from a full dead hang — a bent-arm start is a shortened rep.",
        "Bắt đầu mỗi rep từ tư thế treo duỗi thẳng — treo co tay là rep bị hụt."),
    ],
    default: [
      L("Use the full range on every rep; partial reps train a fraction of the muscle.",
        "Dùng hết biên độ ở mọi rep; rep nửa vời chỉ tập được một phần cơ."),
    ],
  },

  tempo: {
    fast: [
      L("You are moving too quickly — aim for about 2 seconds down and 1 second up.",
        "Bạn đang tập quá nhanh — nhắm khoảng 2 giây hạ và 1 giây đẩy lên."),
      L("Momentum is doing part of the work. Slow the lowering phase until you can stop halfway on command.",
        "Đà đang gánh bớt phần việc. Hạ chậm lại tới mức có thể dừng giữa chừng theo ý muốn."),
      L("Add a one-second pause at the hardest point to kill the bounce.",
        "Thêm một giây dừng ở điểm khó nhất để triệt tiêu đà nảy."),
    ],
    slow: [
      L("Your pace is drifting slow enough that the set becomes an endurance test — tighten the rest between reps.",
        "Nhịp của bạn chậm tới mức hiệp tập thành bài sức bền — rút ngắn nghỉ giữa các rep."),
    ],
    default: [
      L("Keep a metronome-steady count so every rep gets the same time under tension.",
        "Giữ nhịp đếm đều như máy để mỗi rep có cùng thời gian chịu lực."),
    ],
  },

  consistency: {
    default: [
      L("Your later reps drift shorter than your first ones — that is fatigue arriving before your target.",
        "Các rep sau ngắn dần so với rep đầu — đó là dấu hiệu mệt tới trước khi đạt mục tiêu."),
      L("Rep-to-rep depth varies more than it should. Pick one depth cue and hit it every single time.",
        "Độ sâu giữa các rep chênh nhau nhiều hơn mức nên có. Chọn một mốc độ sâu và bám đúng nó mọi rep."),
      L("Stop the set two reps before form breaks rather than grinding to failure.",
        "Dừng hiệp sớm hai rep trước khi vỡ form thay vì cố tới lực kiệt."),
    ],
  },

  alignment: {
    pushup: [
      L("Squeeze your glutes and brace your abs — the hips are dropping below the shoulder-to-ankle line.",
        "Siết mông và gồng bụng — hông đang tụt xuống dưới đường vai–cổ chân."),
      L("Keep the elbows at roughly 45° to the ribs; flaring them out puts the shoulder in a weak position.",
        "Giữ khuỷu tay khoảng 45° so với sườn; xoè ra ngoài đẩy vai vào thế yếu."),
    ],
    squat: [
      L("Drive the knees out over the toes — they are drifting inward under load.",
        "Đẩy gối mở ra theo hướng mũi chân — chúng đang bị đổ vào trong khi chịu tải."),
      L("Keep the chest proud and the spine neutral; the torso is folding forward as you descend.",
        "Giữ ngực mở và cột sống trung tính; thân trên đang gập về trước khi hạ xuống."),
    ],
    curl: [
      L("Pin the upper arm to your ribs — the elbow is travelling forward, which hands the work to the shoulder.",
        "Ghim cánh tay trên vào sườn — khuỷu đang trôi về trước, đẩy phần việc sang vai."),
      L("Stop the torso swing; if you need body english, the load is too heavy.",
        "Bỏ động tác lắc người; nếu phải mượn đà thì tạ đang quá nặng."),
    ],
    pullup: [
      L("Keep the ribs down and the legs quiet — the kip is masking a strength gap.",
        "Giữ sườn xuống và chân yên — đá chân đang che đi phần sức còn thiếu."),
    ],
    plank: [
      L("Stack the elbows directly under the shoulders and stop the hips from sagging.",
        "Đặt khuỷu tay thẳng dưới vai và không để hông võng xuống."),
    ],
    default: [
      L("Hold one straight line from ear to ankle for the whole set.",
        "Giữ một đường thẳng từ tai tới cổ chân trong suốt hiệp."),
      L("Keep your head neutral — look at the floor a little ahead of you, not up.",
        "Giữ đầu trung tính — nhìn sàn phía trước một chút, đừng ngẩng lên."),
    ],
  },

  lockout: {
    default: [
      L("Finish each rep at full extension before starting the next one.",
        "Kết thúc mỗi rep ở tư thế duỗi hết tầm rồi mới bắt đầu rep tiếp theo."),
      L("You are cutting the top of the movement short, which quietly shortens every rep that follows.",
        "Bạn đang cắt ngắn phần trên của động tác, khiến mọi rep sau đó ngắn theo."),
    ],
  },

  general: [
    L("Brace as if about to be punched before each rep, and exhale through the hard part.",
      "Gồng bụng như sắp bị đấm trước mỗi rep, và thở ra ở đoạn nặng nhất."),
    L("Film one set from the side each week — the side angle exposes what a front view hides.",
      "Mỗi tuần quay một hiệp từ bên hông — góc nghiêng lộ ra thứ mà góc chính diện giấu."),
    L("Warm up the working joints with two light sets before the first real one.",
      "Khởi động khớp bằng hai hiệp nhẹ trước hiệp chính đầu tiên."),
    L("Progress one variable at a time — reps, or depth, or tempo. Never all three at once.",
      "Mỗi lần chỉ tăng một biến — số rep, độ sâu, hoặc nhịp. Đừng tăng cả ba cùng lúc."),
    L("Leave one or two reps in reserve; quality reps drive adaptation, grinding reps drive soreness.",
      "Chừa lại một hai rep dự trữ; rep chất lượng tạo thích nghi, rep cố lết chỉ tạo đau nhức."),
  ],

  good: {
    depth: L("Full range of motion on the majority of reps.", "Biên độ đầy đủ ở phần lớn các rep."),
    tempo: L("Controlled, deliberate tempo throughout.", "Nhịp độ có kiểm soát và chủ động xuyên suốt."),
    consistency: L("Rep-to-rep execution stayed remarkably even.", "Chất lượng giữa các rep giữ được rất đều."),
    alignment: L("Clean alignment — the body line held under fatigue.", "Căn chỉnh sạch — giữ được đường thân cả khi mệt."),
    lockout: L("Every rep finished at full extension.", "Mọi rep đều kết thúc ở tư thế duỗi hết tầm."),
    duration: L("Strong time under tension for this hold.", "Thời gian chịu lực tốt cho bài giữ này."),
    line: L("Held a strong, straight body line.", "Giữ đường thân thẳng và vững."),
    stability: L("Minimal drift — the position stayed locked in.", "Rất ít dao động — giữ vững được tư thế."),
    volume: L("Solid working volume for a single set.", "Khối lượng tập tốt cho một hiệp."),
    tracking: L("Clear, well-framed capture the whole way through.", "Khung hình rõ và ổn định suốt buổi."),
  },
};

function tipsFor(dim, formKey, locale, count) {
  const bucket = TIPS[dim] || {};
  const list = bucket[formKey] || bucket.default || [];
  return list.slice(0, count).map((x) => pick(x, locale));
}

/* ---------------- scoring ---------------- */

function scoreReps(cfg, metrics, faults, reps) {
  const key = cfg.formKey;
  const dims = [];
  const add = (k, score, weight) => {
    if (score != null && Number.isFinite(score)) dims.push({ key: k, score: clamp(Math.round(score)), weight });
  };

  // Range of motion against a textbook full range, not the counting threshold.
  const ideal = IDEAL_ROM[key] || Math.abs(cfg.extend - cfg.flex) * 1.8;
  add("depth", metrics?.romAvg != null ? (metrics.romAvg / ideal) * 100 : null, 0.28);

  // Tempo: best around 3.2s per rep, falling off either side.
  if (metrics?.tempoAvgSec != null) {
    const tsec = metrics.tempoAvgSec;
    add("tempo", tsec < 1.2 ? 25 : clamp(100 - Math.abs(tsec - 3.2) * 28, 20, 100), 0.22);
  }

  // Consistency across reps, in both depth and rhythm.
  if (metrics?.romCv != null || metrics?.tempoCv != null) {
    const parts = [];
    if (metrics.romCv != null) parts.push(clamp(100 - metrics.romCv * 300));
    if (metrics.tempoCv != null) parts.push(clamp(100 - metrics.tempoCv * 250));
    add("consistency", parts.reduce((a, b) => a + b, 0) / parts.length, 0.18);
  }

  // Alignment: live form-check pass rate, backed by the fault counters.
  const faultRate = ((faults.depth || 0) + (faults.hips || 0) + (faults.elbows || 0)) / Math.max(1, reps);
  const faultScore = clamp(100 - faultRate * 70);
  const checkVals = Object.values(metrics?.checks || {});
  add("alignment", checkVals.length
    ? faultScore * 0.4 + (checkVals.reduce((a, b) => a + b, 0) / checkVals.length) * 100 * 0.6
    : faultScore, 0.22);

  // Lockout: how close the top of each rep came to full extension.
  const target = LOCKOUT_TARGET[key] || 172;
  add("lockout", metrics?.highestAngle != null ? clamp(100 - (target - metrics.highestAngle) * 4) : null, 0.10);

  return dims;
}

function scoreHold(metrics, faults, holdSeconds) {
  const dims = [];
  const add = (k, score, weight) => {
    if (score != null && Number.isFinite(score)) dims.push({ key: k, score: clamp(Math.round(score)), weight });
  };
  add("duration", (holdSeconds / 75) * 100, 0.30);
  const line = metrics?.checks?.straightBody;
  add("line", line != null ? line * 100 : clamp(100 - (faults.hips || 0) * 6), 0.30);
  const hipLevel = metrics?.checks?.hipLevel;
  add("stability", hipLevel != null ? hipLevel * 100 : clamp(100 - (faults.hips || 0) * 8), 0.25);
  add("tracking", metrics?.trackedRatio != null ? metrics.trackedRatio * 100 : null, 0.15);
  return dims;
}

/* Each rubric's weights sum to 1. Any dimension we could not measure keeps its
   weight and is scored at a neutral prior instead of being renormalised away —
   otherwise a session that only yields one measurable dimension inherits that
   dimension's score outright, and a clean-but-unmeasured set reads as 100%. */
const NEUTRAL_PRIOR = 55;

function total(dims) {
  const measured = dims.reduce((a, d) => a + d.weight, 0);
  if (!measured) return NEUTRAL_PRIOR;
  const earned = dims.reduce((a, d) => a + d.score * d.weight, 0);
  return earned + NEUTRAL_PRIOR * Math.max(0, 1 - measured);
}

export function buildReport({ exercise, snap, profile, locale }) {
  const cfg = exercise.detection;
  const isHold = cfg.mode === "hold";
  const reps = snap.reps || 0;
  const holdSeconds = snap.holdSeconds || 0;
  const durationSec = Math.max(1, snap.elapsed || 0);
  const weightKg = profile.weight || 70;
  const metrics = snap.metrics || null;
  const faults = snap.faults || {};

  const calories = calcCalories({
    exerciseId: exercise.id,
    reps,
    seconds: isHold ? holdSeconds : 0,
    weightKg,
  });

  const sets = isHold
    ? Math.max(1, Math.round(holdSeconds / 45))
    : Math.max(1, Math.round(reps / 10));

  // No real work → an honest empty report, never a fabricated score.
  const noWork = isHold ? holdSeconds < 3 : reps === 0;
  if (noWork) {
    return {
      exerciseId: exercise.id,
      reps: 0, sets: 0, calories: 0, formScore: 0,
      durationSec: Math.round(durationSec),
      holdSeconds: 0,
      noWork: true,
      breakdown: [],
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

  const dims = isHold ? scoreHold(metrics, faults, holdSeconds) : scoreReps(cfg, metrics, faults, reps);
  const overall = total(dims);
  const formScore = +(overall / 10).toFixed(1);

  const breakdown = dims.map((d) => ({ key: d.key, label: pick(DIM_LABEL[d.key], locale), score: d.score }));

  /* ---- what went well: only dimensions that actually earned it ---- */
  const good = [];
  for (const d of [...dims].sort((a, b) => b.score - a.score)) {
    if (d.score >= 78 && TIPS.good[d.key]) good.push(pick(TIPS.good[d.key], locale));
  }
  if (!isHold && reps >= 12) good.push(pick(TIPS.good.volume, locale));
  if (metrics?.trackedRatio != null && metrics.trackedRatio > 0.85 && good.length < 3) {
    good.push(pick(TIPS.good.tracking, locale));
  }
  if (good.length === 0) {
    good.push(locale === "vi"
      ? "Bạn hoàn thành trọn hiệp — đó là nền để cải thiện kỹ thuật."
      : "You completed the full set — that is the base the technique work builds on.");
  }

  /* ---- what to fix: driven by the weakest dimensions, weakest first ---- */
  const fix = [];
  const weak = [...dims].sort((a, b) => a.score - b.score);
  for (const d of weak) {
    if (d.score >= 80) continue;
    const n = d.score < 55 ? 2 : 1; // the worse it is, the more we say about it
    for (const tip of tipsFor(d.key, cfg.formKey, locale, n)) {
      if (!fix.includes(tip)) fix.push(tip);
    }
  }
  // Round out to a substantial, coaching-style list.
  const generals = TIPS.general.map((g) => pick(g, locale));
  let gi = (reps + Math.round(durationSec)) % generals.length;
  while (fix.length < 5) {
    const g = generals[gi % generals.length];
    if (!fix.includes(g)) fix.push(g);
    gi++;
    if (gi > generals.length * 2) break;
  }

  /* ---- next session: target the weakest dimension, then add volume ---- */
  const worst = weak[0];
  const nextBase = isHold
    ? locale === "vi"
      ? `Giữ lâu hơn ~10 giây (mục tiêu ${Math.round(holdSeconds * 1.15) || 45}s) với cùng chất lượng.`
      : `Hold ~10s longer (aim for ${Math.round(holdSeconds * 1.15) || 45}s) at the same quality.`
    : locale === "vi"
      ? `Tăng lên ${Math.round(reps * 1.12) || 12} rep, giữ nguyên chất lượng động tác.`
      : `Bump to ${Math.round(reps * 1.12) || 12} reps while keeping the same movement quality.`;
  const nextFocus = worst
    ? locale === "vi"
      ? ` Ưu tiên số một buổi sau: ${pick(DIM_LABEL[worst.key], locale).toLowerCase()} (${worst.score}/100).`
      : ` Priority for next session: ${pick(DIM_LABEL[worst.key], locale).toLowerCase()} (${worst.score}/100).`
    : "";
  const next = nextBase + nextFocus;

  return {
    exerciseId: exercise.id,
    reps,
    sets,
    calories,
    formScore,
    durationSec: Math.round(durationSec),
    holdSeconds: Math.round(holdSeconds),
    breakdown,
    good,
    fix,
    next,
    quote: quoteForSeed(locale, reps + Math.round(durationSec)),
  };
}
