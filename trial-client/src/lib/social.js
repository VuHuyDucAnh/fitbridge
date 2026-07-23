import { supabase } from "./supabase";

/* Social data access — real posts / kudos / follows through Supabase RLS.
   posts has no FK to profiles, so authors are fetched separately and merged. */

export async function fetchFeed(userId) {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error || !posts?.length) return [];

  const authorIds = [...new Set(posts.map((p) => p.user_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: profs }, { data: kudos }] = await Promise.all([
    supabase.from("profiles").select("id,name,avatar_hue,avatar_url").in("id", authorIds),
    supabase.from("kudos").select("post_id,user_id").in("post_id", postIds),
  ]);

  const byId = {};
  for (const p of profs || []) byId[p.id] = p;

  const kudosCount = {};
  const mine = new Set();
  for (const k of kudos || []) {
    kudosCount[k.post_id] = (kudosCount[k.post_id] || 0) + 1;
    if (k.user_id === userId) mine.add(k.post_id);
  }

  return posts.map((p) => {
    const author = byId[p.user_id];
    return {
      id: p.id,
      userId: p.user_id,
      kind: p.kind,
      caption: p.caption,
      stat: p.stat || {},
      visibility: p.visibility,
      createdAt: p.created_at,
      isMine: p.user_id === userId,
      authorName: author?.name || "FitBridge",
      authorHue: author?.avatar_hue ?? 22,
      authorAvatar: author?.avatar_url || null,
      kudos: kudosCount[p.id] || 0,
      kudoedByMe: mine.has(p.id),
    };
  });
}

export async function createPost({ userId, kind = "text", refId = "", caption = "", stat = {}, visibility = "public" }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, kind, ref_id: refId, caption, stat, visibility })
    .select()
    .maybeSingle();
  return { data, error };
}

export async function deletePost(postId) {
  return supabase.from("posts").delete().eq("id", postId);
}

export async function toggleKudos(postId, userId, on) {
  if (on) return supabase.from("kudos").insert({ post_id: postId, user_id: userId });
  return supabase.from("kudos").delete().eq("post_id", postId).eq("user_id", userId);
}

export async function fetchFollowing(userId) {
  const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  return new Set((data || []).map((r) => r.followee_id));
}

export async function toggleFollow(followerId, followeeId, on) {
  if (on) return supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId });
  return supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
}
