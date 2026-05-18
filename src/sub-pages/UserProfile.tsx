import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "../../supabase-client";

type ProfileData = {
  id: string;
  username: string;
  full_name?: string | null;
};

type Review = {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_name?: string;
};

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

  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
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
      .select("id, username, full_name")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data as ProfileData);
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
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", reviewerIds);

      const nameMap: Record<string, string> = {};
      for (const p of profileData ?? []) {
        nameMap[p.id] = p.full_name || p.username || "User";
      }
      for (const r of rows) {
        r.reviewer_name = nameMap[r.reviewer_id] || "User";
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
      .select("id")
      .eq("reviewer_id", currentUserId)
      .eq("reviewed_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setAlreadyReviewed(!!data);
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

    const { error } = await supabase.from("marketplace_user_reviews").insert({
      reviewer_id: currentUserId,
      reviewed_id: userId,
      rating,
      body: reviewBody.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      setSubmitMessage("Error: " + error.message);
    } else {
      setReviewBody("");
      setRating(5);
      setAlreadyReviewed(true);
      setSubmitMessage("Review submitted!");
      loadReviews();
    }
  }, [currentUserId, userId, rating, reviewBody, loadReviews]);

  // ── render ─────────────────────────────────────────────────────────────────
  const displayName = profile?.full_name || profile?.username || "User";
  const initial = displayName.charAt(0).toUpperCase();

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
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
            >
              {initial}
            </div>
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
            {!loadingReviews && reviews.length === 0 && (
              <p className="text-sm text-slate-500">No reviews yet</p>
            )}
          </div>
        </div>

        {/* Leave a review */}
        {reviewsSupported && currentUserId && currentUserId !== userId && !alreadyReviewed && (
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
              <div>
                <h2 className="text-lg font-black text-white">Leave a Review</h2>
                <p className="text-sm text-slate-400">Rate your experience with this user.</p>
              </div>
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
              {submitting ? "Saving..." : "Save Review"}
            </button>
          </div>
        )}

        {alreadyReviewed && currentUserId !== userId && (
          <div
            className="rounded-2xl p-4 mb-5 text-sm text-slate-300 text-center"
            style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            You have already reviewed this user.
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
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
                    >
                      {(review.reviewer_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-white">
                      {review.reviewer_name || "User"}
                    </span>
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
