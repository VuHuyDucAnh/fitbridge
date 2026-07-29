import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spoken coaching over the Web Speech API.
 *
 * The hard part is not saying things, it is *not* saying things. A pose model
 * emits a cue many times a second, so speaking naively would stutter the same
 * sentence forever and never finish a word. Every call is therefore gated on:
 *   - a global floor between utterances, so the coach never chatters
 *   - a per-cue cooldown, so one persistent fault is not repeated on a loop
 *   - "already speaking" — a low-priority line is dropped rather than queued,
 *     because stale coaching is worse than silence
 * Priority 2 (session start/end, a fresh fault) is allowed to cut in.
 */
export function useSpeech({ enabled, locale }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  // Which language we can actually pronounce: 'vi', 'en', or null for "no
  // voices installed". Callers use it to choose the *wording*, because a
  // Vietnamese line read by an English voice is far worse than an English line
  // read properly — and not every machine ships a Vietnamese voice.
  const [voiceLang, setVoiceLang] = useState(null);
  const voiceRef = useRef(null);
  const lastAt = useRef(0);
  const lastByKey = useRef({});

  // Voices load asynchronously in most browsers, and getVoices() is empty on
  // the first call — hence the voiceschanged listener rather than a one-shot.
  useEffect(() => {
    if (!supported) return;
    const want = locale === "vi" ? "vi" : "en";
    const choose = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const exact = voices.find((v) => v.lang?.toLowerCase().startsWith(want));
      const english = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
      voiceRef.current = exact || english || null;
      setVoiceLang(exact ? want : english ? "en" : null);
    };
    choose();
    window.speechSynthesis.addEventListener?.("voiceschanged", choose);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", choose);
  }, [supported, locale]);

  const cancel = useCallback(() => {
    if (supported) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
  }, [supported]);

  const speak = useCallback(
    (text, { key, priority = 0, minGapMs = 2600, keyGapMs = 9000 } = {}) => {
      if (!enabled || !supported || !text) return false;
      const now = performance.now();

      // Even a cut-in keeps a small floor, or two cues alternating would chop
      // each other into syllables.
      const floor = priority >= 2 ? 1500 : minGapMs;
      if (now - lastAt.current < floor) return false;
      if (priority < 2 && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) return false;
      if (key && now - (lastByKey.current[key] ?? -Infinity) < keyGapMs) return false;

      try {
        if (priority >= 2) window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        // Tag the utterance with the voice we actually resolved, not the UI
        // locale — mismatching the two is what produces robotic mispronunciation.
        u.lang = voiceRef.current?.lang || (locale === "vi" ? "vi-VN" : "en-US");
        u.rate = 1.06;   // a touch brisk: coaching, not narration
        u.pitch = 1;
        u.volume = 1;
        // Isolated: a rejected voice must not take the whole line down with it.
        // Setting .voice to anything the engine dislikes throws, and losing the
        // preferred accent is far better than losing the coaching entirely.
        if (voiceRef.current) {
          try { u.voice = voiceRef.current; } catch { /* fall back to u.lang */ }
        }
        window.speechSynthesis.speak(u);
      } catch {
        return false;
      }

      lastAt.current = now;
      if (key) lastByKey.current[key] = now;
      return true;
    },
    [enabled, supported, locale]
  );

  // Going quiet must stop mid-sentence, not finish the thought.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => cancel, [cancel]);

  const reset = useCallback(() => {
    lastAt.current = 0;
    lastByKey.current = {};
  }, []);

  return { speak, cancel, reset, supported, voiceLang };
}
