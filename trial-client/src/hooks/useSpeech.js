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
 * Motivation audio deliberately does NOT go through here — it is a real file on
 * its own channel (see lib/hypeTrack), so it plays underneath the coaching
 * instead of competing for this queue.
 */
export function useSpeech({ enabled, locale, onVoiceActivity }) {
  // Kept in a ref so changing the callback never re-creates speak() and
  // re-triggers every effect that depends on it.
  const activityRef = useRef(onVoiceActivity);
  activityRef.current = onVoiceActivity;
  const fireActivity = useCallback((speaking) => {
    try { activityRef.current?.(speaking); } catch { /* never break speech */ }
  }, []);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  // Which language we can actually pronounce: 'vi', 'en', or null for "no
  // voices installed". Callers use it to choose the *wording*, because a
  // Vietnamese line read by an English voice is far worse than an English line
  // read properly — and not every machine ships a Vietnamese voice.
  const [voiceLang, setVoiceLang] = useState(null);
  const voiceRef = useRef(null);
  const lastAt = useRef(0);
  const lastByKey = useRef({});
  const lastByGroup = useRef({});

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
    // cancel() fires no onend, so anything ducking under the voice would stay
    // ducked forever without this.
    fireActivity(false);
  }, [supported, fireActivity]);

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

  const isBusy = useCallback(() => {
    if (!supported) return false;
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  }, [supported]);

  const gate = useCallback((now, key, priority, minGapMs, keyGapMs, group, groupGapMs) => {
    // Even a cut-in keeps a small floor, or two cues alternating would chop
    // each other into syllables.
    const floor = priority >= 2 ? 1500 : minGapMs;
    if (now - lastAt.current < floor) return false;
    if (priority < 2 && isBusy()) return false;
    if (key && now - (lastByKey.current[key] ?? -Infinity) < keyGapMs) return false;
    // A group is a shared cooldown across several distinct cues. Per-cue gaps
    // alone let related corrections queue up back to back — three different
    // posture notes in five seconds is nagging, however valid each one is.
    if (group && now - (lastByGroup.current[group] ?? -Infinity) < groupGapMs) return false;
    return true;
  }, [isBusy]);

  const speak = useCallback(
    (text, { key, priority = 0, minGapMs = 2600, keyGapMs = 9000, group, groupGapMs = 20000 } = {}) => {
      if (!enabled || !supported || !text) return false;
      const now = performance.now();
      if (!gate(now, key, priority, minGapMs, keyGapMs, group, groupGapMs)) return false;

      const voice = voiceRef.current;

      try {
        if (priority >= 2) cancel();
        const u = new SpeechSynthesisUtterance(text);
        // Tag the utterance with the voice we actually resolved, not the UI
        // locale — mismatching the two is what produces robotic mispronunciation.
        u.lang = voice?.lang || (locale === "vi" ? "vi-VN" : "en-US");
        u.rate = 1.06;   // a touch brisk: coaching, not narration
        u.pitch = 1;
        u.volume = 1;
        // Isolated: a rejected voice must not take the whole line down with it.
        // Setting .voice to anything the engine dislikes throws, and losing the
        // preferred accent is far better than losing the coaching entirely.
        if (voice) {
          try { u.voice = voice; } catch { /* fall back to u.lang */ }
        }
        u.onstart = () => fireActivity(true);
        u.onend = () => fireActivity(false);
        u.onerror = () => fireActivity(false);
        window.speechSynthesis.speak(u);
      } catch {
        fireActivity(false);
        return false;
      }

      lastAt.current = now;
      if (key) lastByKey.current[key] = now;
      if (group) lastByGroup.current[group] = now;
      return true;
    },
    [enabled, supported, locale, gate, cancel, fireActivity]
  );

  // Going quiet must stop mid-sentence, not finish the thought.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => cancel, [cancel]);

  const reset = useCallback(() => {
    lastAt.current = 0;
    lastByKey.current = {};
    lastByGroup.current = {};
  }, []);

  return { speak, prime, cancel, reset, supported, voiceLang };
}
