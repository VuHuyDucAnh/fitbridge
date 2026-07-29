/* Optional pre-recorded audio for the motivation channel.
 *
 * Empty by design: FitBridge ships no third-party voice recordings. Using a
 * real person's voice — recorded or cloned — in a product is their likeness,
 * not ours to take, and ripping it from a video breaks that platform's terms
 * too. With this list empty the channel synthesizes the lines in a distinct
 * lower voice instead, which needs nobody's permission.
 *
 * If you hold a licence (or record your own), drop the files in
 * `public/hype/` and list them here — they are played instead of the
 * synthesized line, on the same channel, so they can never overlap a form cue:
 *
 *   export const HYPE_CLIPS = [
 *     { src: "/hype/one-more-rep.mp3", ms: 4200 },
 *     { src: "/hype/stay-hard.mp3",    ms: 3100 },
 *   ];
 *
 * `ms` is the clip length; it reserves the audio channel so a spoken cue does
 * not start on top of it.
 */
export const HYPE_CLIPS = [];

export function pickHypeClip(index) {
  if (!HYPE_CLIPS.length) return null;
  return HYPE_CLIPS[Math.abs(index) % HYPE_CLIPS.length];
}
