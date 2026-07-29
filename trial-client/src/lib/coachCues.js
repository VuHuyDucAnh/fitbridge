/* Spoken coaching lines.
   Each cue carries several phrasings so a long set does not turn into the same
   sentence on a loop — the caller rotates through them by seed. Text is written
   to be *heard*, not read: short, imperative, no punctuation a voice would
   stumble on, and no numbers spelled in ways a TTS voice mangles. */

const V = (en, vi) => ({ en, vi });

export const CUE_LINES = {
  /* --- posture / setup --- */
  position: [
    V("Get into position", "Vào đúng tư thế"),
    V("I can't see the movement yet", "Chưa thấy đúng động tác"),
    V("Set up in frame and start again", "Vào khung hình rồi bắt đầu lại"),
  ],
  offFrame: [
    V("Step back so I can see all of you", "Lùi lại để thấy toàn thân"),
    V("Move into the middle of the frame", "Di chuyển vào giữa khung hình"),
  ],

  /* --- push-up / plank --- */
  hips: [
    V("Lift your hips, keep the line", "Nâng hông lên, giữ thẳng thân"),
    V("Hips are dropping, squeeze your glutes", "Hông đang võng, siết mông lại"),
    V("Brace your abs, straighten the line", "Gồng bụng, giữ thân thành một đường"),
  ],
  hipsHigh: [
    V("Lower your hips, you're piking up", "Hạ hông xuống, bạn đang chổng lên"),
    V("Drop the hips into line", "Hạ hông về thẳng hàng"),
  ],
  elbowsFlare: [
    V("Tuck your elbows in", "Ép khuỷu tay vào sát thân"),
    V("Elbows closer to your ribs", "Khuỷu tay sát vào sườn hơn"),
  ],
  headNeutral: [
    V("Keep your head in line, look at the floor", "Giữ đầu thẳng, nhìn xuống sàn"),
    V("Neck neutral, don't crane up", "Cổ trung tính, đừng ngẩng lên"),
  ],

  /* --- depth / range --- */
  deeper: [
    V("Go deeper", "Hạ sâu hơn"),
    V("A little lower on the next one", "Rep sau hạ thấp hơn chút nữa"),
    V("You're stopping short, drop lower", "Bạn đang dừng sớm, hạ thấp hơn"),
  ],
  lockout: [
    V("Finish all the way at the top", "Kết thúc hết tầm ở trên"),
    V("Extend fully before the next rep", "Duỗi hết rồi mới sang rep tiếp"),
  ],

  /* --- squat / lunge --- */
  kneesOut: [
    V("Push your knees out", "Đẩy gối mở ra ngoài"),
    V("Knees are caving, drive them wide", "Gối đang đổ vào trong, mở rộng ra"),
  ],
  chestUp: [
    V("Chest up", "Ngực mở lên"),
    V("You're folding forward, lift your chest", "Bạn đang gập người, nâng ngực lên"),
  ],

  /* --- curl --- */
  elbows: [
    V("Pin your elbows to your sides", "Ghim khuỷu tay sát thân"),
    V("Stop the elbow drifting forward", "Đừng để khuỷu trôi ra trước"),
  ],
  swing: [
    V("Stop swinging, let the arm do the work", "Đừng lắc người, để tay làm việc"),
    V("No body english, keep the torso still", "Không mượn đà, giữ thân yên"),
  ],
  shrug: [
    V("Push your shoulders down, away from your ears", "Đẩy vai xuống, tránh xa tai"),
    V("Drop the shoulders, don't let the traps take over", "Hạ vai xuống, đừng để cơ cầu vai gánh"),
  ],
  chestOut: [
    V("Chest out, open the shoulders", "Ưỡn ngực ra, mở vai"),
    V("Stand tall, proud chest", "Đứng thẳng người, ngực mở"),
  ],

  /* --- pull-up --- */
  chinOverBar: [
    V("Pull higher, chin over the bar", "Kéo cao hơn, cằm qua xà"),
  ],
  deadHang: [
    V("Straighten your arms at the bottom", "Duỗi thẳng tay ở dưới"),
  ],
  kip: [
    V("Keep your legs quiet", "Giữ chân yên"),
  ],

  /* --- tempo --- */
  slower: [
    V("Slow it down, control the movement", "Chậm lại, kiểm soát động tác"),
    V("Too fast, take two seconds to lower", "Nhanh quá, hạ trong hai giây"),
    V("You're rushing, own every rep", "Đang vội rồi, làm chủ từng rep"),
  ],

  /* --- positive reinforcement --- */
  good: [
    V("Good form, keep it there", "Form đẹp, giữ nguyên vậy"),
    V("That's the shape, hold it", "Đúng dáng rồi, giữ vậy"),
    V("Clean rep, same again", "Rep sạch, tiếp tục như vậy"),
    V("Looking strong, stay tight", "Đang tốt đấy, giữ chặt người"),
  ],
  holdStrong: [
    V("Solid line, keep breathing", "Đường thân vững, cứ thở đều"),
    V("Hold it, stay braced", "Giữ nguyên, gồng chặt"),
  ],
  breathe: [
    V("Breathe out through the hard part", "Thở ra ở đoạn nặng nhất"),
  ],
};

/* One setup reminder per set, spoken a few seconds in. Fault detection can only
   speak once something has gone wrong; these are the points worth hearing at
   the top of every set regardless. */
const SETUP_LINES = {
  curl: V("Shoulders down, chest out, elbows pinned to your sides",
          "Đẩy vai xuống, ưỡn ngực ra, ghim khuỷu tay sát thân"),
  pushup: V("One straight line from head to heels, elbows tucked",
            "Thân thẳng một đường từ đầu tới gót, khuỷu tay ép sát"),
  squat: V("Chest up, knees out over your toes, break parallel",
           "Ngực mở, gối đẩy ra theo mũi chân, hạ qua song song"),
  pullup: V("Full hang to start, ribs down, chin over the bar",
            "Treo duỗi thẳng tay, siết sườn, cằm vượt qua xà"),
  plank: V("Elbows under the shoulders, squeeze your glutes, breathe",
           "Khuỷu tay ngay dưới vai, siết mông, thở đều"),
};

export function setupText(formKey, locale) {
  const v = SETUP_LINES[formKey];
  return v ? v[locale] || v.en : null;
}

/* Rep milestones — spoken so you never have to look at the counter. */
export function repMilestoneText(reps, locale) {
  return locale === "vi" ? `${reps} rep` : `${reps} reps`;
}

export function holdMilestoneText(seconds, locale) {
  return locale === "vi" ? `${seconds} giây` : `${seconds} seconds`;
}

export function sessionStartText(exerciseName, locale) {
  return locale === "vi"
    ? `Bắt đầu ${exerciseName}. Vào tư thế nào.`
    : `Starting ${exerciseName}. Get into position.`;
}

export function sessionEndText(reps, isHold, seconds, locale) {
  if (isHold) {
    return locale === "vi"
      ? `Kết thúc. Bạn giữ được ${seconds} giây.`
      : `Session complete. You held for ${seconds} seconds.`;
  }
  return locale === "vi"
    ? `Kết thúc. Tổng cộng ${reps} rep.`
    : `Session complete. ${reps} reps total.`;
}

/** Rotate through the phrasings for a cue so a long set stays varied. */
export function cueText(key, locale, seed = 0) {
  const list = CUE_LINES[key];
  if (!list || !list.length) return null;
  const v = list[Math.abs(seed) % list.length];
  return v[locale] || v.en;
}
