/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Send, ShieldAlert, UserX, X } from "lucide-react";
import { supabase } from "../../supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
};

type PurchaseRequest = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  status: string;
  created_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
};

type ListingMeta = {
  id: string;
  title: string;
  price?: number;
  images?: string[] | null;
};

type UserMeta = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string | null;
};

const REPORT_REASONS = [
  { id: "scam", label: "Scam or deceptive behavior" },
  { id: "harassment", label: "Harassment or abusive language" },
  { id: "spam", label: "Spam" },
  { id: "unsafe", label: "Unsafe meetup/payment behavior" },
  { id: "other", label: "Other", requiresDetails: true },
];

function looksLikeMissingSafetyTables(message?: string) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("marketplace_user_blocks") ||
    lower.includes("marketplace_user_reports") ||
    lower.includes("does not exist")
  );
}


function formatShortTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isYesterday) return "Yesterday";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function AvatarCircle({ name, avatarUrl, size = 40, active = false }: { name: string; avatarUrl?: string | null; size?: number; active?: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: active ? "#1e3a5f" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: active ? "#ffffff" : "#1e3a5f", overflow: "hidden" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initial
        )}
      </div>
      <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e", border: "2px solid #ffffff" }} />
    </div>
  );
}

export default function MarketplaceInbox() {
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listingMap, setListingMap] = useState<Record<string, ListingMeta>>({});
  const [userMap, setUserMap] = useState<Record<string, UserMeta>>({});

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [otherParticipantBlocked, setOtherParticipantBlocked] = useState(false);
  const [blockedByOtherParticipant, setBlockedByOtherParticipant] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const activeConversationId = useMemo(() => {
    if (conversationId) return conversationId;
    return conversations[0]?.id || null;
  }, [conversationId, conversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || !currentUserId) return null;
    return activeConversation.buyer_id === currentUserId
      ? activeConversation.seller_id
      : activeConversation.buyer_id;
  }, [activeConversation, currentUserId]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUserId(user.id);
      setCurrentUserName(user.user_metadata?.username || user.email?.split("@")[0] || "User");
      await loadConversations(user.id);
    });
  }, [navigate]);

useEffect(() => {
  if (!activeConversationId) {
    setMessages([]);
    setPurchaseRequests([]);
    return;
  }

  loadMessages(activeConversationId);
  loadPurchaseRequests(activeConversationId);
}, [activeConversationId]);

  useEffect(() => {
    let active = true;

    if (!currentUserId || !otherParticipantId) {
      setOtherParticipantBlocked(false);
      setBlockedByOtherParticipant(false);
      return () => {
        active = false;
      };
    }

    // Reset immediately while switching conversations so old values don't bleed into new chats.
    setOtherParticipantBlocked(false);
    setBlockedByOtherParticipant(false);

    (async () => {
      const state = await loadBlockState(currentUserId, otherParticipantId);
      if (!active || !state) return;
      setOtherParticipantBlocked(state.otherParticipantBlocked);
      setBlockedByOtherParticipant(state.blockedByOtherParticipant);
    })();

    return () => {
      active = false;
    };
  }, [currentUserId, otherParticipantId]);

  useEffect(() => {
    if (!activeConversationId) return;

    const channel: RealtimeChannel = supabase
      .channel(`marketplace-inbox-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async () => {
          await loadMessages(activeConversationId);
          if (currentUserId) {
            await loadConversations(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId]);

  async function loadConversations(userId: string) {
    setLoadingConversations(true);
    const { data, error } = await supabase
      .from("marketplace_conversations")
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      alert("Unable to load inbox: " + error.message);
      setLoadingConversations(false);
      return;
    }

    const rows = (data || []) as Conversation[];
    setConversations(rows);

    if (rows.length > 0) {
const listingIds = [...new Set(rows.map((row) => row.listing_id))];

const participantIds = [
  ...new Set(
    rows.flatMap((row) => [row.buyer_id, row.seller_id])
  ),
];

const [{ data: listingData }, { data: profileData }] =
  await Promise.all([
    supabase
      .from("marketplace_listings")
      .select("id,title,price,images")
      .in("id", listingIds),

    supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", participantIds),
  ]);

const nextListingMap: Record<string, ListingMeta> = {};
for (const listing of listingData || []) {
  nextListingMap[listing.id] = listing as ListingMeta;
}
setListingMap(nextListingMap);

const nextUserMap: Record<string, UserMeta> = {};
for (const profile of profileData || []) {
  nextUserMap[profile.id] = profile as UserMeta;
}
setUserMap(nextUserMap);

      if (!conversationId) {
        navigate(`/marketplace/inbox/${rows[0].id}`, { replace: true });
      }
    }

    setLoadingConversations(false);
  }

  async function loadMessages(id: string) {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      alert("Unable to load messages: " + error.message);
      setLoadingMessages(false);
      return;
    }

    setMessages((data || []) as ChatMessage[]);
    setLoadingMessages(false);
  }
async function loadPurchaseRequests(id: string) {
  const { data, error } = await supabase
    .from("marketplace_purchase_requests")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load purchase requests:", error.message);
    return;
  }

  setPurchaseRequests((data || []) as PurchaseRequest[]);
}

async function updatePurchaseRequestStatus(
  request: PurchaseRequest,
  nextStatus: "accepted" | "declined"
) {
  const { error: requestError } = await supabase
    .from("marketplace_purchase_requests")
    .update({ status: nextStatus })
    .eq("id", request.id);

  if (requestError) {
    alert("Could not update request: " + requestError.message);
    return;
  }

  if (nextStatus === "accepted") {
    const { error: listingError } = await supabase
      .from("marketplace_listings")
      .update({
        status: "Reserved",
        sold: false,
      })
      .eq("id", request.listing_id);

    if (listingError) {
      alert("Request accepted, but listing was not reserved: " + listingError.message);
      return;
    }
  }

  await supabase.from("marketplace_messages").insert({
    conversation_id: request.conversation_id,
    sender_id: currentUserId,
    sender_name: currentUserName || "Seller",
    body:
      nextStatus === "accepted"
        ? "✅ Purchase request accepted. This item is now reserved for pickup."
        : "❌ Purchase request declined.",
  });

  await loadPurchaseRequests(request.conversation_id);
  await loadMessages(request.conversation_id);
}
  async function loadBlockState(userId: string, otherId: string) {
    const [mine, theirs] = await Promise.all([
      supabase
        .from("marketplace_user_blocks")
        .select("id")
        .eq("blocker_id", userId)
        .eq("blocked_id", otherId)
        .maybeSingle(),
      supabase
        .from("marketplace_user_blocks")
        .select("id")
        .eq("blocker_id", otherId)
        .eq("blocked_id", userId)
        .maybeSingle(),
    ]);

    if (mine.error || theirs.error) {
      const message = mine.error?.message || theirs.error?.message;
      if (looksLikeMissingSafetyTables(message)) {
        return { otherParticipantBlocked: false, blockedByOtherParticipant: false };
      }
      console.error("Unable to load block state:", message);
      return null;
    }

    return {
      otherParticipantBlocked: !!mine.data,
      blockedByOtherParticipant: !!theirs.data,
    };
  }

  const openBlockModal = () => {
    if (!activeConversation || !currentUserId) return;
    setBlockMessage(null);
    setIsBlockModalOpen(true);
  };

  const closeBlockModal = () => {
    setIsBlockModalOpen(false);
    setBlockMessage(null);
    setBlockSubmitting(false);
  };

  const submitBlockParticipant = async () => {
    if (!activeConversation || !currentUserId || !otherParticipantId) return;

    setBlockSubmitting(true);
    setBlockMessage(null);

    const { error } = await supabase.from("marketplace_user_blocks").insert([
      {
        blocker_id: currentUserId,
        blocked_id: otherParticipantId,
        reason: "Blocked from inbox",
      },
    ]);

    if (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "23505") {
        setBlockMessage("This user is already blocked.");
      } else if (looksLikeMissingSafetyTables(error.message)) {
        setBlockMessage(
          "Safety tables are not set up yet. Run src/sql/marketplace_messaging.sql in Supabase SQL Editor."
        );
      } else {
        setBlockMessage("Unable to block this user: " + error.message);
      }
      setBlockSubmitting(false);
      return;
    }

    setOtherParticipantBlocked(true);
    setBlockMessage("User blocked. You can always unblock in Settings > Blocked Users.");
    setBlockSubmitting(false);
  };

  const openReportModal = () => {
    if (!activeConversation || !currentUserId) return;
    setSelectedReportReason("");
    setReportDetails("");
    setReportError(null);
    setReportSuccess(null);
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedReportReason("");
    setReportDetails("");
    setReportError(null);
    setReportSuccess(null);
    setReportSubmitting(false);
  };

  const submitReportParticipant = async () => {
    if (!activeConversation || !currentUserId || !otherParticipantId) return;
    if (!selectedReportReason) {
      setReportError("Please select a reason.");
      return;
    }

    const selected = REPORT_REASONS.find((reason) => reason.id === selectedReportReason);
    if (!selected) {
      setReportError("Please choose a valid reason.");
      return;
    }

    const details = reportDetails.trim();
    if (selected.requiresDetails && (details.length < 3 || details.length > 500)) {
      setReportError("For 'Other', add details between 3 and 500 characters.");
      return;
    }

    setReportSubmitting(true);
    setReportError(null);

    const { error } = await supabase.from("marketplace_user_reports").insert([
      {
        conversation_id: activeConversation.id,
        listing_id: activeConversation.listing_id,
        reporter_id: currentUserId,
        reported_id: otherParticipantId,
        reason: selected.label,
        details: details || null,
      },
    ]);

    if (error) {
      if (looksLikeMissingSafetyTables(error.message)) {
        setReportError(
          "Safety tables are not set up yet. Run src/sql/marketplace_messaging.sql in Supabase SQL Editor."
        );
      } else {
        setReportError("Unable to submit report: " + error.message);
      }
      setReportSubmitting(false);
      return;
    }

    setReportSuccess("Report submitted. Our team can review this conversation.");
    setReportSubmitting(false);
  };

  const sendMessage = async () => {
    if (!activeConversationId || !currentUserId) return;
    if (otherParticipantBlocked || blockedByOtherParticipant) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);

    const { error: msgError } = await supabase.from("marketplace_messages").insert([
      {
        conversation_id: activeConversationId,
        sender_id: currentUserId,
        sender_name: currentUserName || "User",
        body,
      },
    ]);

    if (msgError) {
      alert("Unable to send: " + msgError.message);
      setSending(false);
      return;
    }

    await supabase
      .from("marketplace_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeConversationId);

    setDraft("");
    await loadMessages(activeConversationId);
    if (currentUserId) {
      await loadConversations(currentUserId);
    }
    setSending(false);
  };

  const otherName = userMap[otherParticipantId || ""]?.full_name || userMap[otherParticipantId || ""]?.username || "User";
  const otherAvatarUrl = userMap[otherParticipantId || ""]?.avatar_url || null;
  const activeListing = activeConversation ? listingMap[activeConversation.listing_id] : null;

  return (
    <div className="messages-page" style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", paddingTop: 64, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", width: "100%", padding: "24px 16px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Back link */}
        <button onClick={() => navigate("/marketplace")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280" }}
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </button>

        {/* Main shell */}
        <div className="messages-shell" style={{ display: "grid", gridTemplateColumns: "280px 1fr", backgroundColor: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", height: "calc(100vh - 148px)", minHeight: 500 }}>

          {/* ── LEFT: conversation list ── */}
          <div className="messages-sidebar" style={{ borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div className="messages-sidebar-header" style={{ padding: "18px 16px 12px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>Messages</h2>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
                <input className="messages-input" type="text" placeholder="Search messages..." style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 20, border: "1px solid #e5e7eb", fontSize: 13, backgroundColor: "#f9fafb", color: "#374151", outline: "none", boxSizing: "border-box" }} readOnly />
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingConversations ? (
                <p style={{ padding: 16, fontSize: 13, color: "#9ca3af" }}>Loading...</p>
              ) : conversations.length === 0 ? (
                <p style={{ padding: 16, fontSize: 13, color: "#9ca3af" }}>No conversations yet.</p>
              ) : conversations.map((conv) => {
                const selected = conv.id === activeConversationId;
                const otherId = conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id;
                const participant = userMap[otherId];
                const name = participant?.full_name || participant?.username || "User";
                return (
                  <button className={`messages-conversation ${selected ? "messages-conversation-selected" : ""}`} key={conv.id} onClick={() => navigate(`/marketplace/inbox/${conv.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", border: "none", borderBottom: "1px solid #f3f4f6", backgroundColor: selected ? "#eff6ff" : "transparent", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = selected ? "#eff6ff" : "transparent"; }}
                  >
                    <AvatarCircle name={name} avatarUrl={participant?.avatar_url} size={44} active={selected} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: selected ? "#1d4ed8" : "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 6 }}>{name}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, flexShrink: 0 }}>{formatShortTime(conv.last_message_at)}</p>
                      </div>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listingMap[conv.listing_id]?.title || "Listing"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: chat panel ── */}
          <div className="messages-chat" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!activeConversation ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#9ca3af" }}>
                <p style={{ fontSize: 14 }}>Select a conversation to start messaging</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="messages-chat-header" style={{ padding: "12px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => otherParticipantId && navigate(`/seller/${otherParticipantId}`)}
                    className="messages-profile-link"
                    style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, cursor: otherParticipantId ? "pointer" : "default", textAlign: "left" }}
                    title="View profile"
                  >
                    <AvatarCircle name={otherName} avatarUrl={otherAvatarUrl} size={40} />
                  </button>
                  <button
                    type="button"
                    onClick={() => otherParticipantId && navigate(`/seller/${otherParticipantId}`)}
                    className="messages-profile-link"
                    style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: otherParticipantId ? "pointer" : "default", textAlign: "left" }}
                    title="View profile"
                  >
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{otherName}</p>
                    <p style={{ fontSize: 12, color: "#22c55e", margin: 0, fontWeight: 600 }}>Active now</p>
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="messages-icon-button" onClick={openReportModal} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Report">
                      <ShieldAlert size={15} color="#f59e0b" />
                    </button>
                    <button className="messages-icon-button" onClick={openBlockModal} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title={otherParticipantBlocked ? "Blocked" : "Block"}>
                      <UserX size={15} color={otherParticipantBlocked ? "#ef4444" : "#6b7280"} />
                    </button>
                  </div>
                </div>

                {/* Listing banner */}
                {activeListing && (
                  <div className="messages-item-strip" style={{ margin: "10px 16px 0", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0, backgroundColor: "#e0e7ff" }}>
                        {activeListing.images?.[0] ? (
                          <img src={activeListing.images[0]} alt={activeListing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #818cf8, #6366f1)" }} />
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 2px" }}>Inquiring about</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{activeListing.title}</p>
                      </div>
                    </div>
                    {activeListing.price != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>
                          {activeListing.price === 0 ? "Free" : `$${activeListing.price}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate(`/marketplace/${activeListing.id}`)}
                          className="messages-view-listing-button"
                          style={{ padding: "7px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#ffffff", color: "#111827", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                        >
                          View
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="messages-thread" style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Purchase request cards */}
                  {purchaseRequests.map((request) => {
                    const isSeller = request.seller_id === currentUserId;
                    return (
                      <div className="messages-request-card" key={request.id} style={{ borderRadius: 12, border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4", padding: "12px 14px" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#16a34a", margin: "0 0 4px" }}>
                          {isSeller ? "Order Received" : "Purchase Request Sent"}
                        </p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 3px" }}>${Number(request.offered_price)}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                          Status: <span style={{ fontWeight: 700, color: "#16a34a" }}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                        </p>
                        {isSeller && request.status === "pending" && (
                          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button type="button" onClick={() => updatePurchaseRequestStatus(request, "accepted")} style={{ padding: "8px 0", borderRadius: 8, backgroundColor: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>Accept</button>
                            <button type="button" onClick={() => updatePurchaseRequestStatus(request, "declined")} style={{ padding: "8px 0", borderRadius: 8, backgroundColor: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>Decline</button>
                          </div>
                        )}
                        {!isSeller && request.status === "pending" && (
                          <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0", fontStyle: "italic" }}>Waiting for seller response.</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Date separator */}
                  {messages.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>Today</span>
                      <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
                    </div>
                  )}

                  {loadingMessages ? (
                    <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24 }}>Start the conversation.</p>
                  ) : messages.map((msg) => {
                    const mine = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "72%" }}>
                        <div className={mine ? "messages-bubble-mine" : "messages-bubble-other"} style={{ padding: "10px 14px", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", backgroundColor: mine ? "#1e3a5f" : "#f3f4f6", color: mine ? "#ffffff" : "#111827", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {msg.body}
                        </div>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 4px 0" }}>
                          {formatShortTime(msg.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Block notices */}
                {(otherParticipantBlocked || blockedByOtherParticipant) && (
                  <div style={{ padding: "6px 16px", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
                      {otherParticipantBlocked ? "You blocked this user. Unblock in Settings → Blocked Users." : "You cannot send messages — this user blocked you."}
                    </p>
                  </div>
                )}

                {/* Input bar */}
                <div className="messages-composer" style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                  <input
                    className="messages-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    maxLength={2000}
                    disabled={!activeConversation || otherParticipantBlocked || blockedByOtherParticipant}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 24, border: "1px solid #e5e7eb", fontSize: 14, color: "#111827", outline: "none", backgroundColor: "#f9fafb", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!activeConversation || sending || draft.trim().length === 0 || otherParticipantBlocked || blockedByOtherParticipant}
                    style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "#1e3a5f", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (sending || draft.trim().length === 0 || otherParticipantBlocked || blockedByOtherParticipant) ? 0.45 : 1, transition: "opacity 0.15s" }}
                  >
                    <Send size={16} color="#ffffff" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isBlockModalOpen && activeConversation && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="report-modal-shell bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-2xl font-black text-gray-900">Block User</h2>
                <button onClick={closeBlockModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-700">
                Block this user from messaging you? You won't see each other in active conversations.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                You can always unblock them in Settings under <span className="font-semibold">Blocked Users</span>.
              </p>
              {blockMessage && (
                <div className="report-status-message rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 p-3 mt-4">
                  {blockMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={closeBlockModal}
                  className="report-cancel-button w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitBlockParticipant}
                  disabled={blockSubmitting}
                  className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                >
                  {blockSubmitting ? "Blocking..." : otherParticipantBlocked ? "Blocked" : "Block User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && activeConversation && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="report-modal-shell bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-2xl font-black text-gray-900">Report Conversation</h2>
                <button onClick={closeReportModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="text-gray-500" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm p-4">
                    {reportSuccess}
                  </div>
                  <button
                    onClick={closeReportModal}
                    className="w-full py-3 rounded-xl text-white font-bold"
                    style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">Choose a reason to report this conversation.</p>
                  <div className="space-y-2.5 mb-4">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => {
                          setSelectedReportReason(reason.id);
                          setReportError(null);
                        }}
                        className={`report-reason-button w-full text-left px-4 py-3 rounded-xl border transition font-semibold ${
                          selectedReportReason === reason.id
                            ? "report-reason-selected border-blue-500 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>

                  {selectedReportReason === "other" && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                        Other Details
                      </label>
                      <textarea
                        rows={4}
                        value={reportDetails}
                        onChange={(e) => {
                          setReportDetails(e.target.value);
                          setReportError(null);
                        }}
                        placeholder="Tell us what happened..."
                        className="mt-1.5 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all resize-none"
                        maxLength={500}
                      />
                    </div>
                  )}

                  {reportError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3 mb-4">
                      {reportError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      className="report-cancel-button w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold bg-slate-50 hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitReportParticipant}
                      disabled={reportSubmitting}
                      className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                    >
                      {reportSubmitting ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

