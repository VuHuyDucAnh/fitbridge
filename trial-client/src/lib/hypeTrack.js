/* Motivation audio for a live session.
 *
 * Null by design: FitBridge ships no third-party audio. A voice or a recording
 * belongs to whoever made it, and pulling one out of a video also breaks that
 * platform's terms — so there is nothing here until you supply something you
 * have the right to use.
 *
 * To enable it, drop the file in `public/hype/` and point this at it:
 *
 *   export const HYPE_TRACK = { src: "/hype/motivation.mp3", volume: 0.55 };
 *
 * It then plays in full, starting 5s into a live session, on its own audio
 * channel — so it sits underneath the spoken form coaching rather than
 * blocking it. `volume` is what keeps the coach audible over the top; raise it
 * if the track is quiet, lower it if it is drowning the cues.
 */
export const HYPE_TRACK = null;
