export const POST_LIMITS = { trial: 1, basic: 10, pro: 30, managed: null } as const;
export type Plan = keyof typeof POST_LIMITS;

export function getPlanStatus(profile: {
  plan: Plan;
  trial_ends_at: string | null;
  posts_used_this_period: number;
}) {
  const limit = POST_LIMITS[profile.plan];
  const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialExpired =
    profile.plan === "trial" && (!trialEnds || trialEnds < new Date());
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000))
    : 0;
  const remaining =
    limit === null ? null : Math.max(0, limit - profile.posts_used_this_period);
  return {
    limit,
    trialExpired,
    daysLeft,
    remaining,
    canPost: !trialExpired && (remaining === null || remaining > 0),
  };
}