// "Beast Mode" coach — short, clean, high-intensity motivation.
// Delivered as small on-screen bubbles during hard sets and in the report.
// Kept strictly non-profane.

export const COACH_NAME = "Coach";

export const QUOTES = {
  en: [
    "Stay hard. One more rep.",
    "The wall is where most people stop. Not you.",
    "You don't stop when you're tired. You stop when you're done.",
    "Suffer now, thank yourself later.",
    "Nobody is coming to save you. Get up.",
    "Callus your mind. This is where it's built.",
    "You're not done — you just think you are.",
    "Discipline shows up when motivation clocks out.",
    "Be uncommon among the uncommon.",
    "Push past what your body says. Your mind is stronger.",
    "The only easy day was yesterday. Go.",
    "Greatness lives on the other side of comfortable.",
    "Take souls. Finish this set.",
    "You against you. Win.",
  ],
  vi: [
    "Giữ vững tinh thần. Thêm một rep nữa.",
    "Bức tường là nơi hầu hết mọi người dừng lại. Không phải bạn.",
    "Bạn không dừng khi mệt. Bạn dừng khi đã xong.",
    "Chịu khổ bây giờ, cảm ơn chính mình sau này.",
    "Không ai đến cứu bạn đâu. Đứng dậy.",
    "Rèn cho tâm trí chai sạn. Đây chính là lúc đó.",
    "Bạn chưa xong đâu — bạn chỉ nghĩ vậy thôi.",
    "Kỷ luật xuất hiện khi động lực nghỉ việc.",
    "Hãy phi thường giữa những người phi thường.",
    "Vượt qua điều cơ thể nói. Tâm trí bạn mạnh hơn.",
    "Ngày dễ duy nhất là hôm qua. Tiến lên.",
    "Sự vĩ đại nằm bên kia vùng thoải mái.",
    "Dốc hết sức. Hoàn thành hiệp này.",
    "Bạn đấu với chính bạn. Hãy thắng.",
  ],
};

export function randomQuote(locale = "en") {
  const list = QUOTES[locale] || QUOTES.en;
  return list[Math.floor(Math.random() * list.length)];
}

// Deterministic pick so a session report shows a stable quote.
export function quoteForSeed(locale, seed) {
  const list = QUOTES[locale] || QUOTES.en;
  return list[Math.abs(seed) % list.length];
}
