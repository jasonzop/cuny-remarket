import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { supabase } from "../../supabase-client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MarketplaceListing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  is_free: boolean;
  condition: string;
  images: string[] | null;
  status: "Available" | "Reserved" | "Sold";
  sold: boolean;
  campus_location: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  department_id: number | null;
  course_id: number | null;
  item_category_id: number | null;
  departments?: { id: number; name: string; code: string } | null;
  courses?: { id: number; code: string; name: string } | null;
  item_categories?: { id: number; name: string } | null;
};

const REPORT_REASONS = [
  { id: "counterfeit", label: "Counterfeit or fake item" },
  { id: "scam", label: "Likely scam or misleading listing" },
  { id: "prohibited", label: "Prohibited or unsafe item" },
  { id: "harassment", label: "Harassment or abusive behavior" },
  { id: "spam", label: "Spam or duplicate listing" },
  { id: "other", label: "Other", requiresDetails: true },
];

function formatPrice(item: MarketplaceListing) {
  return item.is_free || Number(item.price) === 0
    ? "Free"
    : `$${Number(item.price).toFixed(2)}`;
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);

  const [actionLoading, setActionLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── fetch listing ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("marketplace_listings")
      .select("*, departments(*), courses(*), item_categories(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("Listing not found:", error?.message);
        } else {
          setListing(data as MarketplaceListing);
        }
        setLoading(false);
      });
  }, [id]);

  // ── saved items ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) { setSavedIds([]); return; }
    supabase
      .from("marketplace_saved_items")
      .select("listing_id")
      .eq("user_id", currentUserId)
      .then(({ data }) => {
        setSavedIds((data ?? []).map((r: any) => r.listing_id).filter(Boolean));
      });
  }, [currentUserId]);

  // ── blocked sellers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) { setBlockedSellerIds([]); return; }
    supabase
      .from("marketplace_user_blocks")
      .select("blocked_id")
      .eq("blocker_id", currentUserId)
      .then(({ data }) => {
        setBlockedSellerIds((data ?? []).map((r: any) => r.blocked_id).filter(Boolean));
      });
  }, [currentUserId]);

  // ── map ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!listing?.latitude || !listing?.longitude) return;
    const lat = listing.latitude;
    const lng = listing.longitude;
    const timer = setTimeout(() => {
      const map = new maplibregl.Map({
        container: "listing-detail-map",
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [lng, lat],
        zoom: 14,
      });
      new maplibregl.Marker({ color: "#6B30FF" }).setLngLat([lng, lat]).addTo(map);
    }, 100);
    return () => clearTimeout(timer);
  }, [listing]);

  const isSaved = useMemo(
    () => (listing ? savedIds.includes(listing.id) : false),
    [listing, savedIds]
  );

  // ── actions ───────────────────────────────────────────────────────────────
  const handleToggleSave = useCallback(async () => {
    if (!listing) return;
    if (!currentUserId) { alert("Please log in first."); return; }
    if (isSaved) {
      await supabase
        .from("marketplace_saved_items")
        .delete()
        .eq("user_id", currentUserId)
        .eq("listing_id", listing.id);
      setSavedIds((prev) => prev.filter((x) => x !== listing.id));
    } else {
      await supabase
        .from("marketplace_saved_items")
        .upsert({ user_id: currentUserId, listing_id: listing.id });
      setSavedIds((prev) => [...prev, listing.id]);
    }
  }, [listing, currentUserId, isSaved]);

  const handleMessageSeller = useCallback(async () => {
    if (!listing) return;
    if (!currentUserId) { alert("Please log in first."); return; }
    if (currentUserId === listing.user_id) { navigate("/marketplace/inbox"); return; }
    if (blockedSellerIds.includes(listing.user_id)) {
      alert("You blocked this seller. Unblock them before messaging.");
      return;
    }
    setActionLoading(true);
    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", currentUserId)
      .eq("seller_id", listing.user_id)
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("marketplace_conversations")
        .insert({
          listing_id: listing.id,
          buyer_id: currentUserId,
          seller_id: listing.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }
    setActionLoading(false);
    if (conversationId) navigate(`/marketplace/inbox/${conversationId}`);
  }, [listing, currentUserId, blockedSellerIds, navigate]);

  const handleBuyNow = useCallback(async () => {
    if (!listing || !currentUserId) { alert("Please log in first."); return; }
    if (currentUserId === listing.user_id) { alert("You cannot buy your own listing."); return; }
    if (listing.status !== "Available") { alert("This item is not available."); return; }

    setBuyLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBuyLoading(false); return; }

    const buyerName =
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Buyer";

    let { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", currentUserId)
      .eq("seller_id", listing.user_id)
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("marketplace_conversations")
        .insert({
          listing_id: listing.id,
          buyer_id: currentUserId,
          seller_id: listing.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      await supabase.from("marketplace_purchase_requests").insert({
        conversation_id: conversationId,
        listing_id: listing.id,
        buyer_id: currentUserId,
        seller_id: listing.user_id,
        offered_price: listing.price,
        status: "pending",
      });

      await supabase.from("marketplace_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_name: buyerName,
        body: `🛍️ Purchase Request: ${buyerName} wants to buy "${listing.title}" for ${formatPrice(listing)}.`,
      });
    }

    setBuyLoading(false);
    setIsBuyModalOpen(false);
    alert("Purchase request sent!");
    if (conversationId) navigate(`/marketplace/inbox/${conversationId}`);
  }, [listing, currentUserId, navigate]);

  const handleDeleteListing = useCallback(async () => {
    if (!listing) return;
    if (!window.confirm("Delete this listing?")) return;
    const { error } = await supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", listing.id);
    if (error) alert("Error deleting: " + error.message);
    else navigate("/my-listings");
  }, [listing, navigate]);

  const handleUpdateStatus = useCallback(
    async (status: "Available" | "Reserved" | "Sold") => {
      if (!listing) return;
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ status, sold: status === "Sold" })
        .eq("id", listing.id);
      if (error) alert("Could not update status: " + error.message);
      else setListing((prev) => (prev ? { ...prev, status } : prev));
    },
    [listing]
  );

  const handleReportListing = useCallback(async () => {
    if (!listing || !currentUserId) return;
    if (!reportReason) { setReportMessage("Please select a reason."); return; }
    setActionLoading(true);
    const { error } = await supabase.from("marketplace_listing_reports").insert({
      listing_id: listing.id,
      reporter_id: currentUserId,
      seller_id: listing.user_id,
      reason: reportReason,
      details: reportDetails || null,
      status: "pending",
    });
    setActionLoading(false);
    if (error) {
      setReportMessage("Could not submit report: " + error.message);
    } else {
      setIsReportModalOpen(false);
      setReportReason("");
      setReportDetails("");
      alert("Report submitted. Thanks for keeping CUNY ReMarket safe.");
    }
  }, [listing, currentUserId, reportReason, reportDetails]);

  const handleBlockSeller = useCallback(async () => {
    if (!listing || !currentUserId) return;
    if (currentUserId === listing.user_id) { setBlockMessage("You cannot block yourself."); return; }
    setActionLoading(true);
    const { error } = await supabase.from("marketplace_user_blocks").upsert({
      blocker_id: currentUserId,
      blocked_id: listing.user_id,
    });
    setActionLoading(false);
    if (error) {
      setBlockMessage("Error blocking: " + error.message);
    } else {
      setBlockedSellerIds((prev) => [...new Set([...prev, listing.user_id])]);
      setIsBlockModalOpen(false);
      navigate("/marketplace");
    }
  }, [listing, currentUserId, navigate]);

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0f1a" }}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0b0f1a" }}>
        <p className="text-white text-xl font-bold">Listing not found.</p>
        <Link to="/marketplace" className="text-blue-400 underline">Back to Marketplace</Link>
      </div>
    );
  }

  const isOwner = currentUserId === listing.user_id;

  return (
    <div className="min-h-screen" style={{ background: "#0b0f1a", paddingTop: 72 }}>
      {/* Back */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition font-semibold mb-8"
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Main card */}
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
          {/* Image */}
          <div className="w-full md:w-[55%] min-h-[340px] bg-gray-100 flex items-center justify-center">
            <img
              src={listing.images?.[0] || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
              alt={listing.title}
              className="w-full h-full object-cover"
              style={{ maxHeight: 600 }}
            />
          </div>

          {/* Details */}
          <div className="w-full md:w-[45%] p-8 md:p-12 flex flex-col" style={{ background: "#0b1733" }}>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {listing.courses?.code && (
                <span className="px-3 py-1 bg-blue-900/60 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  {listing.courses.code}
                </span>
              )}
              <span className="px-3 py-1 bg-purple-900/60 text-purple-300 rounded-full text-xs font-bold uppercase tracking-wider">
                {listing.condition}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  listing.status === "Available"
                    ? "bg-green-900/60 text-green-300"
                    : listing.status === "Reserved"
                    ? "bg-amber-900/60 text-amber-300"
                    : "bg-red-900/60 text-red-300"
                }`}
              >
                {listing.status}
              </span>
              {listing.campus_location && (
                <span className="px-3 py-1 bg-cyan-900/60 text-cyan-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  {listing.campus_location.split(" ")[0]}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black text-white mb-3">{listing.title}</h1>
            <p className="text-4xl font-bold text-green-400 mb-6">{formatPrice(listing)}</p>

            {/* Description */}
            {listing.description && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Dept / Course */}
            {(listing.departments || listing.courses) && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department / Course</h3>
                <p className="text-slate-300 text-sm">
                  {listing.departments?.name || ""}
                  {listing.courses?.code ? ` • ${listing.courses.code}` : ""}
                </p>
              </div>
            )}

            {/* Location */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location</h3>
              {listing.location_name && (
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-blue-400 flex-shrink-0" />
                  <span className="text-slate-300 text-sm">{listing.location_name}</span>
                </div>
              )}
              {listing.latitude && (
                <div
                  id="listing-detail-map"
                  className="w-full h-44 rounded-2xl overflow-hidden border border-white/10"
                />
              )}
              {!listing.latitude && listing.campus_location && (
                <p className="text-slate-300 text-sm">{listing.campus_location}</p>
              )}
            </div>

            {/* Seller */}
            <div className="border-t border-white/10 pt-5 mb-6 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
              >
                {listing.seller_avatar_url ? (
                  <img src={listing.seller_avatar_url} alt="Seller" className="w-full h-full object-cover rounded-full" />
                ) : (
                  listing.seller_name?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Listed By</p>
                <p className="text-sm font-bold text-white">{listing.seller_name || "Anonymous"}</p>
                {!isOwner && (
                  <Link
                    to={`/seller/${listing.user_id}`}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    View profile reviews
                  </Link>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {isOwner ? (
              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={() => navigate(`/sell?edit=${listing.id}`)}
                  className="w-full py-4 bg-blue-600 text-white text-base font-bold rounded-2xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Pencil size={18} /> Edit Listing
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {(["Available", "Reserved", "Sold"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className={`rounded-xl border px-2 py-3 text-xs font-bold ${
                        listing.status === s
                          ? "border-blue-400 bg-blue-900/60 text-blue-300"
                          : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDeleteListing}
                  className="w-full py-4 bg-red-900/40 text-red-400 border border-red-800/60 text-base font-bold rounded-2xl hover:bg-red-900/60 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Delete Listing
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-auto">
                {/* Save */}
                <button
                  onClick={handleToggleSave}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all ${
                    isSaved
                      ? "border-pink-400/60 bg-pink-900/40 text-pink-400"
                      : "border-pink-800/40 bg-pink-900/20 text-pink-400 hover:bg-pink-900/40"
                  }`}
                >
                  <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
                  {isSaved ? "Saved to Favorites" : "Save to Favorites"}
                </button>

                {/* Message */}
                <button
                  onClick={handleMessageSeller}
                  disabled={actionLoading || listing.status !== "Available"}
                  className="w-full py-5 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition"
                  style={{ background: "linear-gradient(90deg,#2563eb,#4f46e5)" }}
                >
                  <MessageCircle size={20} /> Message Seller
                </button>

                {/* Buy */}
                <button
                  onClick={() => setIsBuyModalOpen(true)}
                  disabled={listing.status !== "Available"}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <ShoppingBag size={18} /> Buy Now
                </button>

                {/* Report / Block */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setReportMessage(null); setIsReportModalOpen(true); }}
                    className="w-full py-3.5 rounded-xl border border-amber-700/40 bg-amber-900/20 text-amber-400 font-bold hover:bg-amber-900/40 flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={16} /> Report
                  </button>
                  <button
                    onClick={() => { setBlockMessage(null); setIsBlockModalOpen(true); }}
                    className="w-full py-3.5 rounded-xl border border-red-700/40 bg-red-900/20 text-red-400 font-bold hover:bg-red-900/40 flex items-center justify-center gap-2"
                  >
                    <UserX size={16} /> Block Seller
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-8 flex justify-center items-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} CUNY ReMarket. All rights reserved.</p>
        <span className="text-gray-600">•</span>
        <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-gray-400">Privacy Policy</Link>
      </div>

      {/* Buy Modal */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl" style={{ background: "#0b1733", border: "1px solid rgba(0,170,255,0.2)" }}>
            <div className="p-7">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-black text-white">Confirm Purchase Request</h2>
                <button onClick={() => setIsBuyModalOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="text-slate-300" />
                </button>
              </div>
              <div className="rounded-2xl p-5 mb-5" style={{ background: "#13284d", border: "1px solid rgba(0,170,255,0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Item</p>
                <p className="text-xl font-black text-white mb-4">{listing.title}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Price</p>
                <p className="text-3xl font-black text-green-400">{formatPrice(listing)}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBuyNow}
                  disabled={buyLoading}
                  className="w-full py-3 rounded-2xl text-white font-bold hover:opacity-90 disabled:opacity-70"
                  style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                >
                  {buyLoading ? "Sending..." : `Buy for ${formatPrice(listing)}`}
                </button>
                <button
                  onClick={() => { setIsBuyModalOpen(false); handleMessageSeller(); }}
                  className="w-full py-3 rounded-2xl font-bold text-slate-200 hover:bg-white/10"
                  style={{ border: "1px solid rgba(0,170,255,0.2)", background: "#13284d" }}
                >
                  Negotiate / Message Seller
                </button>
                <button onClick={() => setIsBuyModalOpen(false)} className="w-full py-3 rounded-2xl text-slate-400 hover:bg-white/5 font-bold">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] p-7 shadow-2xl" style={{ background: "#0b1733", border: "1px solid rgba(0,170,255,0.2)" }}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black text-slate-100">Report Listing</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="rounded-full p-2 text-slate-300 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-base text-slate-300">Choose a reason to report this listing.</p>
            <div className="space-y-3 mb-5">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => { setReportReason(reason.id); setReportMessage(null); }}
                  className={`w-full rounded-xl border px-5 py-4 text-left text-base font-semibold transition ${
                    reportReason === reason.id
                      ? "border-purple-400/60 bg-purple-700 text-white"
                      : "text-slate-100 hover:bg-white/5"
                  }`}
                  style={reportReason !== reason.id ? { border: "1px solid rgba(0,170,255,0.2)", background: "#13284d" } : {}}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            {reportReason === "other" && (
              <textarea
                rows={4}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none mb-5"
                style={{ background: "#0c1b37", border: "1px solid rgba(0,170,255,0.2)" }}
                placeholder="Tell us what happened..."
                maxLength={500}
              />
            )}
            {reportMessage && (
              <div className="mb-4 rounded-xl p-3 text-sm text-amber-100" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                {reportMessage}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-full rounded-xl py-4 text-lg font-bold text-slate-100 hover:bg-white/5"
                style={{ border: "1px solid rgba(0,170,255,0.2)", background: "#13284d" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReportListing}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
              >
                {actionLoading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-7">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-2xl font-black text-gray-900">Block Seller</h2>
                <button onClick={() => setIsBlockModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-700">
                Block <span className="font-semibold">{listing.seller_name || "this seller"}</span>? You will not be able to message each other, and their listings will be hidden.
              </p>
              {blockMessage && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 p-3 mt-4">
                  {blockMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => setIsBlockModalOpen(false)}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold bg-slate-50 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockSeller}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-70"
                  style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                >
                  {actionLoading ? "Blocking..." : "Block Seller"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
