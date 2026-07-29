/* Motivation audio for a live session.
 *
 * Played in order on their own audio channel, so they sit underneath the spoken
 * form coaching rather than blocking it. The first starts a few seconds into a
 * session; each one after waits for the previous to finish and then for a
 * couple of reps, so a track never lands on top of the one before it.
 *
 *   volume        level while nothing is being spoken
 *   duckedVolume  level while the coach is mid-sentence, so a form correction
 *                 is never lost under the music. The stage ramps between the
 *                 two rather than stepping, which is far less jarring.
 *
 * Leave the array empty to ship no audio at all. Whatever is listed here is
 * served publicly with the app, so it needs to be something you have the right
 * to distribute — a track lifted from a video is not.
 */
export const HYPE_TRACKS = [
  { src: "/hype/motivation.mp3", volume: 0.6, duckedVolume: 0.14 },
  { src: "/hype/motivation-2.mp3", volume: 0.6, duckedVolume: 0.14 },
];

/** Seconds into the session before the first track starts. */
export const FIRST_TRACK_DELAY_MS = 5000;
/** Reps of breathing room between one track finishing and the next starting. */
export const TRACK_REP_GAP = 3;
/** Fallback when reps are not registering, so the queue never stalls forever. */
export const TRACK_STALL_MS = 25000;
