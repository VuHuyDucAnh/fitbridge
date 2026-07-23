// Exercise catalog. Each entry carries bilingual copy + a detection config
// consumed by the pose-detection engine (see hooks/usePoseDetection.js).
//
// Angle thresholds map to the proven logic from the original prototype:
//   flex   = contracted joint angle (bottom of a push-up / curled bicep)
//   extend = lengthened joint angle (lockout / hang)
//   countPhase = which transition increments a rep.

export const EXERCISES = [
  {
    id: "pushup",
    name: { en: "Push-up", vi: "Chống đẩy" },
    category: { en: "Upper body", vi: "Thân trên" },
    difficulty: "beginner",
    targets: ["chest", "triceps", "shoulders"],
    volume: { en: "3 sets × 12 reps", vi: "3 hiệp × 12 lần" },
    description: {
      en: "Builds pressing strength across the chest, triceps and front delts while training a rock-solid core.",
      vi: "Xây sức đẩy cho ngực, tay sau và vai trước, đồng thời rèn phần lõi vững chắc.",
    },
    notes: {
      en: [
        "Keep a straight line from head to heels — no sagging hips.",
        "Lower until your chest is a fist from the floor.",
        "Elbows track at roughly 45°, not flared wide.",
        "Brace your core and glutes the whole time.",
      ],
      vi: [
        "Giữ đường thẳng từ đầu đến gót — không võng hông.",
        "Hạ tới khi ngực cách sàn khoảng một nắm tay.",
        "Khuỷu tay khoảng 45°, không xòe quá rộng.",
        "Siết cơ lõi và mông trong suốt động tác.",
      ],
    },
    detection: { mode: "reps", joint: "elbow", flex: 100, extend: 150, countPhase: "extend", formKey: "pushup" },
  },
  {
    id: "squat",
    name: { en: "Squat", vi: "Squat" },
    category: { en: "Lower body", vi: "Thân dưới" },
    difficulty: "intermediate",
    targets: ["quads", "glutes", "hamstrings"],
    volume: { en: "4 sets × 12 reps", vi: "4 hiệp × 12 lần" },
    description: {
      en: "The foundation of lower-body strength — quads, glutes and hamstrings through a full range of motion.",
      vi: "Nền tảng sức mạnh thân dưới — đùi trước, mông và gân kheo qua biên độ đầy đủ.",
    },
    notes: {
      en: [
        "Push your hips back before the knees bend.",
        "Keep your chest tall and spine neutral.",
        "Knees track over your toes, never caving in.",
        "Drive through your heels to stand.",
      ],
      vi: [
        "Đẩy hông ra sau trước khi gập gối.",
        "Giữ ngực cao và cột sống trung tính.",
        "Gối đi theo mũi chân, không đổ vào trong.",
        "Đạp qua gót để đứng lên.",
      ],
    },
    detection: { mode: "reps", joint: "knee", flex: 100, extend: 160, countPhase: "extend", formKey: "squat" },
  },
  {
    id: "bicep-curl",
    name: { en: "Bicep curl", vi: "Cuốn tạ tay trước" },
    category: { en: "Arms", vi: "Tay" },
    difficulty: "beginner",
    targets: ["biceps", "forearms"],
    volume: { en: "3 sets × 10 reps", vi: "3 hiệp × 10 lần" },
    description: {
      en: "Isolates the biceps with controlled flexion. Great for arm size and elbow health.",
      vi: "Cô lập cơ tay trước với chuyển động có kiểm soát. Tốt cho kích thước tay và khớp khuỷu.",
    },
    notes: {
      en: [
        "Pin your elbows to your sides.",
        "Lift with the muscle, not momentum.",
        "Lower slowly — the negative builds the arm.",
        "Don't swing your torso.",
      ],
      vi: [
        "Ép khuỷu tay sát thân.",
        "Nâng bằng cơ, không lấy đà.",
        "Hạ chậm — pha âm mới xây cơ tay.",
        "Đừng đung đưa thân người.",
      ],
    },
    detection: { mode: "reps", joint: "elbow", flex: 50, extend: 150, countPhase: "flex", formKey: "curl" },
  },
  {
    id: "pull-up",
    name: { en: "Pull-up", vi: "Hít xà" },
    category: { en: "Back", vi: "Lưng" },
    difficulty: "advanced",
    targets: ["back", "biceps", "shoulders"],
    volume: { en: "4 sets × 6 reps", vi: "4 hiệp × 6 lần" },
    description: {
      en: "The king of back exercises — lats, mid-back and biceps working against your full bodyweight.",
      vi: "Ông vua bài tập lưng — xô, giữa lưng và tay trước làm việc với toàn bộ trọng lượng cơ thể.",
    },
    notes: {
      en: [
        "Start from a full dead hang.",
        "Pull your elbows down and back.",
        "Chin clears the bar at the top.",
        "Lower with control — no dropping.",
      ],
      vi: [
        "Bắt đầu từ tư thế treo thẳng tay.",
        "Kéo khuỷu tay xuống và ra sau.",
        "Cằm vượt qua xà ở đỉnh.",
        "Hạ có kiểm soát — không thả rơi.",
      ],
    },
    detection: { mode: "reps", joint: "elbow", flex: 75, extend: 150, countPhase: "flex", formKey: "pullup" },
  },
  {
    id: "lunge",
    name: { en: "Lunge", vi: "Chùng chân" },
    category: { en: "Lower body", vi: "Thân dưới" },
    difficulty: "intermediate",
    targets: ["glutes", "quads", "hamstrings"],
    volume: { en: "3 sets × 12 each leg", vi: "3 hiệp × 12 mỗi chân" },
    description: {
      en: "Single-leg strength and balance for glutes and quads, evening out left-right differences.",
      vi: "Sức mạnh và thăng bằng một chân cho mông và đùi trước, cân bằng chênh lệch trái-phải.",
    },
    notes: {
      en: [
        "Step to a comfortable stride length.",
        "Drop the back knee toward the floor.",
        "Front knee stays over the ankle.",
        "Push through the front heel to rise.",
      ],
      vi: [
        "Bước tới độ dài thoải mái.",
        "Hạ gối sau về phía sàn.",
        "Gối trước giữ trên mắt cá.",
        "Đạp qua gót trước để đứng lên.",
      ],
    },
    detection: { mode: "reps", joint: "knee", flex: 100, extend: 160, countPhase: "extend", formKey: "squat" },
  },
  {
    id: "plank",
    name: { en: "Plank", vi: "Plank" },
    category: { en: "Core", vi: "Cơ lõi" },
    difficulty: "beginner",
    targets: ["abs", "obliques", "shoulders"],
    volume: { en: "3 × 60 sec hold", vi: "3 × giữ 60 giây" },
    description: {
      en: "An isometric core hold that trains anti-extension — a straight, braced line from head to heel.",
      vi: "Bài giữ tĩnh cho cơ lõi, rèn chống ưỡn — một đường thẳng, siết chặt từ đầu đến gót.",
    },
    notes: {
      en: [
        "Stack shoulders over elbows.",
        "Squeeze glutes; flatten your lower back.",
        "Don't let the hips sag or pike up.",
        "Breathe steadily — keep the brace.",
      ],
      vi: [
        "Vai thẳng trên khuỷu tay.",
        "Siết mông; làm phẳng lưng dưới.",
        "Đừng để hông võng hay nhô lên.",
        "Thở đều — giữ độ siết.",
      ],
    },
    detection: { mode: "hold", joint: "hip", straight: 165, formKey: "plank" },
  },
];

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

export const DIFFICULTY_LABEL = {
  beginner: { en: "Beginner", vi: "Người mới" },
  intermediate: { en: "Intermediate", vi: "Trung cấp" },
  advanced: { en: "Advanced", vi: "Nâng cao" },
};
