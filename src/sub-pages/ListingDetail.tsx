import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabase-client";
import { Heart, MessageCircle, Share2, ShieldAlert, UserX } from "lucide-react";

type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  is_free: boolean;
  condition: string;
  images: string[] | null;
  status: "Available" | "Reserved" | "Sold";
  campus_location: string | null;
  location_name: string | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  created_at: string;
  departments?: { name: string; code: string } | null;
  courses?: { code: string; name: string } | null;
  item_categories?: { name: string } | null;
};

const REPORT_REASONS = [
  { id: "counterfeit", label: "Counterfeit or fake item" },
  { id: "scam", label: "Likely scam or misleading listing" },
  { id: "prohibited", label: "Prohibited or unsafe item" },
  { id: "harassment", label: "Harassment or abusive behavior" },
  { id: "spam", label: "Spam or duplicate listing" },
  { id: "other", label: "Other", requiresDetails: true },
];

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const briq: React.CSSProperties = { fontFamily: "'Bricolage Grotesque', sans-serif" };

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("marketplace_listings")
      .select("*, departments(*), courses(*), item_categories(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate("/marketplace"); return; }
        setItem(data as Listing);
        setLoading(false);
      });
  }, [id, navigate]);

  useEffect(() => {
    if (!currentUserId || !id) return;
    supabase.from("marketplace_saved_items")
      .select("id").eq("user_id", currentUserId).eq("listing_id", id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [currentUserId, id]);

  const formatPrice = () =>
    !item ? "" : item.is_free || Number(item.price) === 0 ? "Free" : `$${Number(item.price)}`;

  const handleMessage = async () => {
    if (!item) return;
    if (!currentUserId) { navigate("/login"); return; }
    if (currentUserId === item.user_id) { navigate("/marketplace/inbox"); return; }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: existing } = await supabase.from("marketplace_conversations")
      .select("id").eq("listing_id", item.id).eq("buyer_id", user.id).eq("seller_id", item.user_id).maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: newConv } = await supabase.from("marketplace_conversations")
        .insert({ listing_id: item.id, buyer_id: user.id, seller_id: item.user_id, last_message_at: new Date().toISOString() })
        .select("id").single();
      convId = newConv?.id;
    }
    setActionLoading(false);
    if (convId) navigate(`/marketplace/inbox/${convId}`);
  };

  const handleToggleSave = async () => {
    if (!currentUserId || !item) { navigate("/login"); return; }
    if (saved) {
      await supabase.from("marketplace_saved_items").delete().eq("user_id", currentUserId).eq("listing_id", item.id);
      setSaved(false);
    } else {
      await supabase.from("marketplace_saved_items").upsert({ user_id: currentUserId, listing_id: item.id }, { onConflict: "user_id,listing_id" });
      setSaved(true);
    }
  };

  const handleReport = async () => {
    if (!item || !currentUserId) return;
    const selected = REPORT_REASONS.find(r => r.id === reportReason);
    if (!selected) { setReportMsg("Please select a reason."); return; }
    if (selected.requiresDetails && reportDetails.trim().length < 3) { setReportMsg("Please add details."); return; }
    const { error } = await supabase.from("marketplace_listing_reports").insert({
      reporter_id: currentUserId, seller_id: item.user_id, listing_id: item.id,
      reason: selected.label, details: reportDetails.trim() || null,
    });
    if (error) { setReportMsg("Could not submit: " + error.message); return; }
    setReportMsg("Report submitted. Thank you.");
    setTimeout(() => { setIsReportOpen(false); setReportMsg(null); setReportReason(""); setReportDetails(""); }, 1800);
  };

  const handleBlock = async () => {
    if (!item || !currentUserId) return;
    const { error } = await supabase.from("marketplace_user_blocks").upsert(
      { blocker_id: currentUserId, blocked_id: item.user_id, reason: "Blocked from listing" },
      { onConflict: "blocker_id,blocked_id" }
    );
    if (error) { setBlockMsg("Could not block: " + error.message); return; }
    setBlockMsg("Seller blocked.");
    setTimeout(() => { setIsBlockOpen(false); setBlockMsg(null); navigate("/marketplace"); }, 1500);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f4ed", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(0,0,0,0.1)", borderTop: "3px solid #1a1216", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!item) return null;

  const daysAgo = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f4ed", paddingTop: 80, position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "24px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>
          <Link to="/marketplace" style={{ color: "inherit", textDecoration: "none" }}>Browse</Link>
          <span>/</span>
          <span>{item.courses?.code || "Listing"}</span>
          <span>/</span>
          <span style={{ color: "#1a1216" }}>{item.title}</span>
        </div>

        {/* 2-column card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", backgroundColor: "#ffffff", border: "1px solid rgba(0,0,0,0.1)" }}>

          {/* LEFT: images */}
          <div>
            <div style={{ aspectRatio: "4/3", backgroundColor: "#e8e3d9", position: "relative", overflow: "hidden", backgroundImage: "repeating-linear-gradient(-45deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }}>
              {item.images?.[selectedImg] ? (
                <img src={item.images[selectedImg]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 75" preserveAspectRatio="none">
                    <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                  </svg>
                  <span style={{ position: "absolute", bottom: 10, left: 12, ...mono, fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.25)", textTransform: "uppercase", letterSpacing: "0.12em" }}>cover photo · main</span>
                </>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
              {[0,1,2,3].map(i => (
                <div key={i} onClick={() => item.images?.[i] && setSelectedImg(i)}
                  style={{ aspectRatio: "1", backgroundColor: i === selectedImg ? "#e8e3d9" : "#f4f0e8", borderRight: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none", cursor: item.images?.[i] ? "pointer" : "default", position: "relative", overflow: "hidden", backgroundImage: "repeating-linear-gradient(-45deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }}>
                  {item.images?.[i]
                    ? <img src={item.images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 50 50" preserveAspectRatio="none"><line x1="0" y1="0" x2="50" y2="50" stroke="rgba(0,0,0,0.1)" strokeWidth="1" /></svg>}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: details */}
          <div style={{ padding: "28px 28px 28px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 999, backgroundColor: item.status === "Available" ? "#d1fae5" : "#f1f5f9", color: item.status === "Available" ? "#065f46" : "#475569", border: `1px solid ${item.status === "Available" ? "#6ee7b7" : "#cbd5e1"}` }}>
                {item.status.toLowerCase()}
              </span>
            </div>

            <h1 style={{ ...briq, fontSize: 24, fontWeight: 800, color: "#1a1216", margin: "0 0 6px", lineHeight: 1.2 }}>{item.title}</h1>
            {item.description && <p style={{ ...briq, fontSize: 13, color: "rgba(0,0,0,0.5)", margin: "0 0 14px", fontStyle: "italic", lineHeight: 1.5 }}>{item.description.slice(0,120)}{item.description.length > 120 ? "…" : ""}</p>}

            <div style={{ marginBottom: 18 }}>
              <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 42, color: "#1a1216", letterSpacing: "-0.01em" }}>{formatPrice()}</span>
            </div>

            {/* Info rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "14px 0", marginBottom: 20 }}>
              {[
                { label: "COURSE", value: `${item.courses?.code || "–"} · ${item.departments?.name || ""}` },
                { label: "CONDITION", value: item.condition },
                { label: "POSTED", value: daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago` },
                { label: "PICKUP", value: item.campus_location || "Not specified" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", width: 68, flexShrink: 0, paddingTop: 2 }}>{label}</span>
                  <span style={{ ...briq, fontSize: 13, fontWeight: 600, color: "#1a1216" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            {currentUserId !== item.user_id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleMessage} disabled={actionLoading || item.status !== "Available"}
                  style={{ width: "100%", padding: "13px", borderRadius: 999, border: "2px solid #1a1216", backgroundColor: "#1a1216", color: "#ffffff", ...briq, fontSize: 14, fontWeight: 800, cursor: item.status !== "Available" ? "not-allowed" : "pointer", opacity: item.status !== "Available" ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "3px 3px 0 rgba(0,0,0,0.18)" }}>
                  <MessageCircle size={17} /> Message seller
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleToggleSave}
                    style={{ flex: 1, padding: "9px", borderRadius: 999, border: "1.5px solid rgba(0,0,0,0.15)", backgroundColor: saved ? "#fdf2f8" : "#ffffff", color: saved ? "#db2777" : "#1a1216", ...briq, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Heart size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => navigator.share?.({ title: item.title, url: window.location.href }).catch(() => {})}
                    style={{ flex: 1, padding: "9px", borderRadius: 999, border: "1.5px solid rgba(0,0,0,0.15)", backgroundColor: "#ffffff", color: "#1a1216", ...briq, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Share2 size={15} /> Share
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setIsReportOpen(true)}
                    style={{ flex: 1, padding: "8px", borderRadius: 999, border: "1.5px solid rgba(0,0,0,0.12)", backgroundColor: "#fffbeb", color: "#92400e", ...briq, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <ShieldAlert size={13} /> Report
                  </button>
                  <button onClick={() => setIsBlockOpen(true)}
                    style={{ flex: 1, padding: "8px", borderRadius: 999, border: "1.5px solid rgba(0,0,0,0.12)", backgroundColor: "#fff5f5", color: "#991b1b", ...briq, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <UserX size={13} /> Block seller
                  </button>
                </div>
              </div>
            ) : (
              <Link to={`/sell?edit=${item.id}`}
                style={{ width: "100%", padding: "12px", borderRadius: 999, border: "2px solid #1a1216", backgroundColor: "#ffffff", color: "#1a1216", ...briq, fontSize: 14, fontWeight: 800, textAlign: "center", textDecoration: "none", display: "block" }}>
                Edit listing
              </Link>
            )}

            {/* Seller card */}
            <div style={{ marginTop: 20, padding: "14px", border: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "#e8e3d9", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", ...briq, fontSize: 17, fontWeight: 800, color: "#1a1216" }}>
                {item.seller_avatar_url
                  ? <img src={item.seller_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (item.seller_name?.[0]?.toUpperCase() || "?")}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...briq, fontSize: 14, fontWeight: 800, color: "#1a1216", margin: 0 }}>{item.seller_name || "Anonymous"}</p>
                <p style={{ ...mono, fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.38)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "3px 0 0" }}>
                  {item.campus_location?.split(" ")[0] || "CUNY"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {isReportOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 16 }}>
          <div style={{ backgroundColor: "#ffffff", maxWidth: 440, width: "100%", padding: 28 }}>
            <h2 style={{ ...briq, fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>Report listing</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {REPORT_REASONS.map(r => (
                <button key={r.id} onClick={() => { setReportReason(r.id); setReportMsg(null); }}
                  style={{ padding: "10px 14px", border: `1.5px solid ${reportReason === r.id ? "#1a1216" : "rgba(0,0,0,0.15)"}`, backgroundColor: reportReason === r.id ? "#1a1216" : "#ffffff", color: reportReason === r.id ? "#ffffff" : "#1a1216", ...briq, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>
                  {r.label}
                </button>
              ))}
            </div>
            {reportReason === "other" && (
              <textarea rows={3} value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Details..." style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.15)", padding: "10px", ...briq, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 12 }} />
            )}
            {reportMsg && <p style={{ ...mono, fontSize: 11, color: "#065f46", marginBottom: 12 }}>{reportMsg}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setIsReportOpen(false)} style={{ flex: 1, padding: "11px", border: "1.5px solid rgba(0,0,0,0.15)", backgroundColor: "#ffffff", ...briq, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleReport} style={{ flex: 1, padding: "11px", border: "2px solid #1a1216", backgroundColor: "#1a1216", color: "#ffffff", ...briq, fontWeight: 800, cursor: "pointer" }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Block modal */}
      {isBlockOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 16 }}>
          <div style={{ backgroundColor: "#ffffff", maxWidth: 400, width: "100%", padding: 28 }}>
            <h2 style={{ ...briq, fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>Block seller</h2>
            <p style={{ ...briq, fontSize: 13, color: "rgba(0,0,0,0.6)", marginBottom: 20 }}>Block <strong>{item?.seller_name || "this seller"}</strong>? Their listings will be hidden from you.</p>
            {blockMsg && <p style={{ ...mono, fontSize: 11, color: "#065f46", marginBottom: 12 }}>{blockMsg}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setIsBlockOpen(false)} style={{ flex: 1, padding: "11px", border: "1.5px solid rgba(0,0,0,0.15)", backgroundColor: "#ffffff", ...briq, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleBlock} style={{ flex: 1, padding: "11px", border: "2px solid #991b1b", backgroundColor: "#991b1b", color: "#ffffff", ...briq, fontWeight: 800, cursor: "pointer" }}>Block</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
