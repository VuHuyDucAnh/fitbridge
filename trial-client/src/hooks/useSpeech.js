import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spoken coaching over the Web Speech API, on two channels.
 *
 * The hard part is not saying things, it is *not* saying things. A pose model
 * emits a cue many times a second, so speaking naively would stutter the same
 * sentence forever and never finish a word. Every call is therefore gated on:
 *   - a global floor between utterances, so the coach never chatters
 *   - a per-cue cooldown, so one persistent fault is not repeated on a loop
 *   - "already busy" — a low-priority line is dropped rather than queued,
 *     because stale coaching is worse than silence
 * Priority 2 (session start/end, a fresh fault) is allowed to cut in.
 *
 * The "hype" channel (motivation) shares those gates so it can never talk over
 * a form correction, but uses a different voice and a lower, slower delivery so
 * the two are clearly distinguishable by ear.
 */
export function useSpeech({ enabled, locale }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  // Which language we can actually pronounce: 'vi', 'en', or null for "no
  // voices installed". Callers use it to choose the *wording*, because a
  // Vietnamese line read by an English voice is far worse than an English line
  // read properly — and not every machine ships a Vietnamese voice.
  const [voiceLang, setVoiceLang] = useState(null);
  const voiceRef = useRef(null);
  const hypeVoiceRef = useRef(null);
  const audioRef = useRef(null);
  const busyUntil = useRef(0);
  const lastAt = useRef(0);
  const lastByKey = useRef({});

  // Voices load asynchronously in most browsers, and getVoices() is empty on
  // the first call — hence the voiceschanged listener rather than a one-shot.
  useEffect(() => {
    if (!supported) return;
    const want = locale === "vi" ? "vi" : "en";
    const choose = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const matching = voices.filter((v) => v.lang?.toLowerCase().startsWith(want));
      const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
      const pool = matching.length ? matching : english;
      voiceRef.current = pool[0] || null;
      // A genuinely different voice for motivation when the system has one;
      // otherwise the pitch/rate shift below still separates the channels.
      hypeVoiceRef.current = pool[1] || pool[0] || null;
      setVoiceLang(matching.length ? want : english.length ? "en" : null);
    };
    choose();
    window.speechSynthesis.addEventListener?.("voiceschanged", choose);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", choose);
  }, [supported, locale]);

  const cancel = useCallback(() => {
    if (supported) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    const a = audioRef.current;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
    }
    busyUntil.current = 0;
  }, [supported]);

  /**
   * Unlock the speech engine from inside a real click.
   *
   * Browsers only let speech start in a user gesture, and a session begins
   * asynchronously — camera permission, then the pose model over the network —
   * so by the time anything has something to say, the gesture is long gone and
   * every utterance is silently dropped. Speaking one silent utterance during
   * the click itself opens the channel for the rest of the session. It also
   * forces getVoices() to populate, which is empty on first call in Chrome.
   */
  const prime = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.resume?.();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [supported]);

  // Busy = a synthesized line in flight *or* an audio clip playing. Both
  // channels must respect one another or they simply talk over each other.
  const isBusy = useCallback(() => {
    if (performance.now() < busyUntil.current) return true;
    if (!supported) return false;
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  }, [supported]);

  const gate = useCallback((now, key, priority, minGapMs, keyGapMs) => {
    // Even a cut-in keeps a small floor, or two cues alternating would chop
    // each other into syllables.
    const floor = priority >= 2 ? 1500 : minGapMs;
    if (now - lastAt.current < floor) return false;
    if (priority < 2 && isBusy()) return false;
    if (key && now - (lastByKey.current[key] ?? -Infinity) < keyGapMs) return false;
    return true;
  }, [isBusy]);

  const speak = useCallback(
    (text, { key, priority = 0, minGapMs = 2600, keyGapMs = 9000, style = "coach" } = {}) => {
      if (!enabled || !supported || !text) return false;
      const now = performance.now();
      if (!gate(now, key, priority, minGapMs, keyGapMs)) return false;

      const hype = style === "hype";
      const voice = hype ? hypeVoiceRef.current : voiceRef.current;

      try {
        if (priority >= 2) cancel();
        const u = new SpeechSynthesisUtterance(text);
        // Tag the utterance with the voice we actually resolved, not the UI
        // locale — mismatching the two is what produces robotic mispronunciation.
        u.lang = voice?.lang || (locale === "vi" ? "vi-VN" : "en-US");
        u.rate = hype ? 0.92 : 1.06;   // motivation lands slower and heavier
        u.pitch = hype ? 0.6 : 1;      // and lower, so the channels never blur
        u.volume = 1;
        // Isolated: a rejected voice must not take the whole line down with it.
        // Setting .voice to anything the engine dislikes throws, and losing the
        // preferred accent is far better than losing the coaching entirely.
        if (voice) {
          try { u.voice = voice; } catch { /* fall back to u.lang */ }
        }
        window.speechSynthesis.speak(u);
      } catch {
        return false;
      }

      lastAt.current = now;
      if (key) lastByKey.current[key] = now;
      return true;
    },
    [enabled, supported, locale, gate, cancel]
  );

  /**
   * Play a pre-recorded clip on the same gated channel. Used for the hype line
   * when the app has been given licensed audio to play; falls back to speak()
   * at the call site when there is none.
   */
  const playClip = useCallback(
    (url, { key, priority = 0, minGapMs = 4000, keyGapMs = 60000, estimateMs = 9000 } = {}) => {
      if (!enabled || !url) return false;
      const now = performance.now();
      if (!gate(now, key, priority, minGapMs, keyGapMs)) return false;

      try {
        cancel();
        const a = audioRef.current || (audioRef.current = new Audio());
        a.src = url;
        a.volume = 1;
        // Hold the channel for an estimate, then release precisely on 'ended' —
        // duration is unknown until the file loads, and an un-held channel lets
        // a form cue start on top of the clip.
        busyUntil.current = now + estimateMs;
        a.onended = () => { busyUntil.current = 0; };
        a.onerror = () => { busyUntil.current = 0; };
        a.play().catch(() => { busyUntil.current = 0; });
      } catch {
        busyUntil.current = 0;
        return false;
      }

      lastAt.current = now;
      if (key) lastByKey.current[key] = now;
      return true;
    },
    [enabled, gate, cancel]
  );

  // Going quiet must stop mid-sentence, not finish the thought.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => cancel, [cancel]);

  const reset = useCallback(() => {
    lastAt.current = 0;
    lastByKey.current = {};
    busyUntil.current = 0;
  }, []);

  return { speak, playClip, prime, cancel, reset, supported, voiceLang };
}
