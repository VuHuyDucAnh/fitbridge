/* Motivation audio for a live session.
 *
 * Plays in full, starting 5s into a live session, on its own audio channel —
 * so it sits underneath the spoken form coaching rather than blocking it.
 *
 *   volume        level while nothing is being spoken
 *   duckedVolume  level while the coach is mid-sentence, so a form correction
 *                 is never lost under the music. The stage ramps between the
 *                 two rather than stepping, which is far less jarring.
 *
 * Set to null to ship no audio at all. Whatever you point this at is served
 * publicly with the app, so it needs to be something you have the right to
 * distribute — a track lifted from a video is not.
 */
export const HYPE_TRACK = { src: "/hype/motivation.mp3", volume: 0.6, duckedVolume: 0.14 };
