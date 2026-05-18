import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "../../supabase-client";

type ProfileData = {
  id: string;
  username: string;
  full_name?: string | null;
  campus?: string | null;
  major?: string | null;
  year?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

type Review = {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar_url?: string | null;
  reviewer_campus?: string | null;
  reviewer_major?: string | null;
  reviewer_year?: string | null;
};

function isMissingYearColumn(error?: { message?: string; details?: string; hint?: string; code?: string } | null) {
  if (!error) return false;
  const text = JSON.stringify(error).toLowerCase();
  return text.includes("year") && (text.includes("schema cache") || text.includes("column"));
}

function isMissingProfileExtraColumn(
  error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined,
  column: string
) {
  if (!error) return false;
  const text = JSON.stringify(error).toLowerCase();
  return text.includes(column) && (text.includes("schema cache") || text.includes("column"));
}

function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ cursor: onChange ? "pointer" : "default", background: "none", border: "none", padding: 0 }}
        >
          <Star
            size={size}
            fill={(hover || value) >= n ? "#facc15" : "none"}
            stroke={(hover || value) >= n ? "#facc15" : "#6b7280"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function ProfileAvatar({
  name,
  avatarUrl,
  sizeClass,
  textClass,
}: {
  name: string;
  avatarUrl?: string | null;
  sizeClass: string;
  textClass: string;
}) {
  const initial = (name || "U").charAt(0).toUpperCase();
  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white font-black`}
      style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={textClass}>{initial}</span>
      )}
    </div>
  );
}

function ProfileBadges({ campus, major, year }: { campus?: string | null; major?: string | null; year?: string | null }) {
  if (!campus && !major && !year) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {campus && (
        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
          {campus}
        </span>
      )}
      {major && (
        <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-200">
          {major}
        </span>
      )}
      {year && (
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
          {year}
        </span>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsSupported, setReviewsSupported] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [currentUserReviewId, setCurrentUserReviewId] = useState<string | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [savedReviewRating, setSavedReviewRating] = useState(5);
  const [savedReviewBody, setSavedReviewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const avgRating =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("id, username, full_name, campus, major, year, bio, avatar_url")
      .eq("id", userId)
      .single()
      .then(async ({ data, error }) => {
        if (!error && data) {
          setProfile(data as ProfileData);
        } else if (isMissingYearColumn(error) || isMissingProfileExtraColumn(error, "bio")) {
          const fallback = await supabase
            .from("profiles")
            .select("id, username, full_name, campus, major, avatar_url")
            .eq("id", userId)
            .single();
          if (!fallback.error && fallback.data) setProfile(fallback.data as ProfileData);
        }
        setLoadingProfile(false);
      });
  }, [userId]);

  // ── fetch reviews ─────────────────────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    if (!userId) return;
    setLoadingReviews(true);

    const { data, error } = await supabase
      .from("marketplace_user_reviews")
      .select("*")
      .eq("reviewed_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("marketplace_user_reviews query error:", error);
      setReviewsSupported(false);
      setLoadingReviews(false);
      return;
    }

    const rows = (data ?? []) as Review[];

    // Fetch reviewer names from profiles
    const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];
    if (reviewerIds.length > 0) {
      let { data: profileData, error: reviewerProfileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, campus, major, year, avatar_url")
        .in("id", reviewerIds);

      if (isMissingYearColumn(reviewerProfileError)) {
        const fallback = await supabase
          .from("profiles")
          .select("id, username, full_name, campus, major, avatar_url")
          .in("id", reviewerIds);
        profileData = (fallback.data || []).map((profile) => ({
          ...profile,
          year: null,
        }));
      }

      const profileMap: Record<string, ProfileData> = {};
      for (const p of profileData ?? []) {
        profileMap[p.id] = p as ProfileData;
      }
      for (const r of rows) {
        const reviewer = profileMap[r.reviewer_id];
        r.reviewer_name = reviewer?.full_name || reviewer?.username || "User";
        r.reviewer_avatar_url = reviewer?.avatar_url || null;
        r.reviewer_campus = reviewer?.campus || null;
        r.reviewer_major = reviewer?.major || null;
        r.reviewer_year = reviewer?.year || null;
      }
    }

    setReviews(rows);
    setLoadingReviews(false);
  }, [userId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // ── check if already reviewed ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !userId || !reviewsSupported) return;
    supabase
      .from("marketplace_user_reviews")
      .select("id, rating, body")
      .eq("reviewer_id", currentUserId)
      .eq("reviewed_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setAlreadyReviewed(!!data);
        setCurrentUserReviewId(data?.id ?? null);
        if (data) {
          setRating(data.rating || 5);
          setReviewBody(data.body || "");
          setSavedReviewRating(data.rating || 5);
          setSavedReviewBody(data.body || "");
        }
      });
  }, [currentUserId, userId, reviewsSupported]);

  // ── submit review ─────────────────────────────────────────────────────────
  const handleSubmitReview = useCallback(async () => {
    if (!currentUserId) { alert("Please log in to leave a review."); return; }
    if (!userId) return;
    if (currentUserId === userId) { setSubmitMessage("You cannot review yourself."); return; }
    if (!rating) { setSubmitMessage("Please select a star rating."); return; }

    setSubmitting(true);
    setSubmitMessage(null);

    const payload = {
      rating,
      body: reviewBody.trim() || null,
    };

    const { error } = currentUserReviewId
      ? await supabase
          .from("marketplace_user_reviews")
          .update(payload)
          .eq("id", currentUserReviewId)
          .eq("reviewer_id", currentUserId)
      : await supabase.from("marketplace_user_reviews").insert({
          reviewer_id: currentUserId,
          reviewed_id: userId,
          ...payload,
        });

    setSubmitting(false);

    if (error) {
      setSubmitMessage("Error: " + error.message);
    } else {
      setAlreadyReviewed(true);
      setIsEditingReview(false);
      setSavedReviewRating(rating);
      setSavedReviewBody(reviewBody);
      setSubmitMessage(currentUserReviewId ? "Review updated!" : "Review submitted!");
      loadReviews();
    }
  }, [currentUserId, userId, rating, reviewBody, currentUserReviewId, loadReviews]);

  // ── render ─────────────────────────────────────────────────────────────────
  const displayName = profile?.full_name || profile?.username || "User";

  return (
    <div className="min-h-screen" style={{ background: "#0b0f1a", paddingTop: 80 }}>
      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-slate-300 hover:text-white transition"
            style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          {currentUserId === userId && (
            <Link
              to="/saved-items"
              className="px-4 py-2 rounded-2xl font-semibold text-slate-300 hover:text-white transition"
              style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Edit Wishlist
            </Link>
          )}
        </div>

        {/* Profile card */}
        <div
          className="rounded-3xl p-6 mb-5 flex items-center gap-5"
          style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {loadingProfile ? (
            <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse" />
          ) : (
            <ProfileAvatar
              name={displayName}
              avatarUrl={profile?.avatar_url}
              sizeClass="w-16 h-16"
              textClass="text-2xl"
            />
          )}
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Public Profile</p>
            <h1 className="text-2xl font-black text-white mb-1">
              {loadingProfile ? "Loading..." : displayName}
            </h1>
            {!loadingReviews && reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(avgRating)} size={18} />
                <span className="text-sm font-semibold text-slate-300">
                  {avgRating.toFixed(1)} average from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            <ProfileBadges campus={profile?.campus} major={profile?.major} year={profile?.year} />
            {profile?.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                {profile.bio}
              </p>
            )}
            {!loadingReviews && reviews.length === 0 && (
              <p className="text-sm text-slate-500">No reviews yet</p>
            )}
          </div>
        </div>

        {/* Leave a review */}
        {reviewsSupported && currentUserId && currentUserId !== userId && (!alreadyReviewed || isEditingReview) && (
          <div
            className="rounded-3xl p-6 mb-5"
            style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
              >
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-white">
                  {alreadyReviewed ? "Edit Your Review" : "Leave a Review"}
                </h2>
                <p className="text-sm text-slate-400">Rate your experience with this user.</p>
              </div>
              {alreadyReviewed && (
                <button
                  type="button"
                  onClick={() => {
                    setRating(savedReviewRating);
                    setReviewBody(savedReviewBody);
                    setSubmitMessage(null);
                    setIsEditingReview(false);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-200 transition hover:text-white"
                  style={{ background: "#13284d", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mb-4">
              <StarRating value={rating} onChange={setRating} size={32} />
            </div>

            <textarea
              rows={4}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder={`Share your experience with ${displayName}...`}
              maxLength={500}
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none mb-4"
              style={{ background: "#13284d", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            {submitMessage && (
              <div
                className="rounded-xl p-3 text-sm mb-4"
                style={{
                  background: submitMessage.startsWith("Error")
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(34,197,94,0.12)",
                  color: submitMessage.startsWith("Error") ? "#fca5a5" : "#86efac",
                  border: `1px solid ${submitMessage.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                }}
              >
                {submitMessage}
              </div>
            )}

            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 disabled:opacity-60 transition"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            >
              {submitting ? "Saving..." : alreadyReviewed ? "Update Review" : "Save Review"}
            </button>
          </div>
        )}

        {alreadyReviewed && currentUserId !== userId && !isEditingReview && (
          <div
            className="rounded-2xl p-4 mb-5 text-sm text-slate-300 text-center"
            style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p>You have already reviewed this user.</p>
            <button
              type="button"
              onClick={() => {
                setSubmitMessage(null);
                setIsEditingReview(true);
              }}
              className="mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            >
              Edit your review
            </button>
          </div>
        )}

        {!reviewsSupported && (
          <div
            className="rounded-2xl p-4 mb-5 text-sm text-amber-300 text-center"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
          >
            Reviews table not accessible. Run the updated SQL in <code>src/sql/marketplace_reviews.sql</code> (check browser console for the exact error).
          </div>
        )}

        {/* Reviews list */}
        {!loadingReviews && reviews.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-black text-white">Reviews</h2>
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl p-5"
                style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ProfileAvatar
                      name={review.reviewer_name || "User"}
                      avatarUrl={review.reviewer_avatar_url}
                      sizeClass="w-9 h-9 rounded-full"
                      textClass="text-xs"
                    />
                    <div>
                      <span className="text-sm font-bold text-white">
                        {review.reviewer_name || "User"}
                      </span>
                      <ProfileBadges
                        campus={review.reviewer_campus}
                        major={review.reviewer_major}
                        year={review.reviewer_year}
                      />
                    </div>
                  </div>
                  <StarRating value={review.rating} size={16} />
                </div>
                {review.body && (
                  <p className="text-sm text-slate-300 leading-relaxed">{review.body}</p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}

        {loadingReviews && reviewsSupported && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
