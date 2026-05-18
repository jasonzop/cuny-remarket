/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, ShieldAlert, UserX, X } from "lucide-react";
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
  images?: string[] | null;
  price?: number | null;
  is_free?: boolean | null;
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

function formatMessageTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
      .select("id,title,images,price,is_free")
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

  const activeListingTitle = activeConversation
    ? listingMap[activeConversation.listing_id]?.title || "Listing"
    : "No item selected";
  const activeListing = activeConversation
    ? listingMap[activeConversation.listing_id]
    : null;
  const activeOtherUser = otherParticipantId ? userMap[otherParticipantId] : null;
  const activeOtherName =
    activeOtherUser?.full_name || activeOtherUser?.username || "User";

  const renderAvatar = (user?: UserMeta | null, size = 44) => (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[#17120c]/30 bg-[#fffdf7] text-sm font-black"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (user?.full_name || user?.username || "U").charAt(0).toUpperCase()
        )}
      </span>
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#fffaf0] bg-[#22c55e]" />
    </span>
  );

  const renderListingThumb = (listing?: ListingMeta | null) => (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-[#17120c]/25 bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]">
      {listing?.images?.[0] ? (
        <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 50 50" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="50" y2="50" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
        </svg>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1eadc] px-3 pt-24 pb-10 text-[#17120c]">
      <div className="pointer-events-none fixed inset-0 [background-image:linear-gradient(rgba(23,18,12,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,18,12,0.055)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 mx-auto max-w-7xl border border-black/25 bg-[#fffaf0] shadow-[10px_10px_0_rgba(23,18,12,0.08)]">
        <div className="flex items-center justify-between gap-4 border-b border-black/25 px-4 py-3">
          <button
            onClick={() => navigate("/marketplace")}
            className="inline-flex items-center gap-2 border border-black/25 bg-[#fffaf0] px-3 py-1.5 text-xs font-black transition hover:bg-black hover:text-white"
          >
            <ArrowLeft size={14} />
            Browse
          </button>
          <div className="flex items-center gap-3 text-xs font-bold">
            <button onClick={() => navigate("/marketplace")} className="border-b border-black">Browse</button>
            <button onClick={() => navigate("/sell")} className="text-black/55 hover:text-black">Sell</button>
            <span className="border-b border-black text-black">Inbox</span>
            <button onClick={() => navigate("/profile")} className="text-black/55 hover:text-black">Profile</button>
          </div>
        </div>

        <div className="grid min-h-[72vh] grid-cols-1 overflow-hidden md:grid-cols-[220px_1fr_230px]">
          <aside className="border-r border-black/25 bg-[#f6efe1] p-3">
            <div className="mb-3 flex gap-1">
              {["All", "Buying", "Selling"].map((tab) => (
                <span
                  key={tab}
                  className={`border border-black/25 px-3 py-1 text-[11px] font-black ${
                    tab === "All" ? "bg-[#17120c] text-white" : "bg-[#fffaf0] text-[#17120c]"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            {loadingConversations ? (
              <p className="text-sm text-black/55">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <div className="border border-dashed border-black/25 bg-[#fffaf0] p-4 text-sm text-black/55">
                No conversations yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {conversations.map((conversation) => {
                  const selected = conversation.id === activeConversationId;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => navigate(`/marketplace/inbox/${conversation.id}`)}
                      className={`w-full border p-2.5 text-left transition-all ${
                        selected
                          ? "border-black bg-[#fffaf0] shadow-[3px_3px_0_rgba(23,18,12,0.10)]"
                          : "border-black/15 bg-transparent hover:border-black/40 hover:bg-[#fffaf0]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {renderAvatar(
                          userMap[
                            conversation.buyer_id === currentUserId
                              ? conversation.seller_id
                              : conversation.buyer_id
                          ],
                          38
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-[#17120c]">
                            {userMap[
                              conversation.buyer_id === currentUserId
                                ? conversation.seller_id
                                : conversation.buyer_id
                            ]?.full_name ||
                              userMap[
                                conversation.buyer_id === currentUserId
                                  ? conversation.seller_id
                                  : conversation.buyer_id
                              ]?.username ||
                              "User"}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-black/55">
                            {listingMap[conversation.listing_id]?.title || "Listing"}
                          </p>
                          <p className="mt-1 text-[10px] text-black/38">
                            {formatMessageTime(conversation.last_message_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex min-h-[72vh] flex-col border-r border-black/25 bg-[#fffdf7]">
            <div className="flex items-center justify-between gap-3 border-b border-black/25 bg-[#fffaf0] p-3">
              <h3 className="truncate text-lg font-black text-[#17120c]">
                {activeConversation ? (
                  <div className="flex items-center gap-3">
                    {renderAvatar(activeOtherUser, 48)}
                    <div>
                      <p className="truncate text-sm font-black text-[#17120c]">
                        {activeOtherName}
                      </p>
                      <p className="text-xs font-medium text-[#22a35a]">
                        Active now
                      </p>
                    </div>
                  </div>
                ) : (
                  "Select a conversation"
                )}
              </h3>
              {activeConversation && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openReportModal}
                    className="inline-flex items-center gap-1.5 border border-black/25 bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#17120c] transition hover:bg-black hover:text-white"
                  >
                    <ShieldAlert size={14} />
                    Report
                  </button>
                  <button
                    onClick={openBlockModal}
                    className="inline-flex items-center gap-1.5 border border-black/25 bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#17120c] transition hover:bg-black hover:text-white"
                  >
                    <UserX size={14} />
                    {otherParticipantBlocked ? "Blocked" : "Block"}
                  </button>
                </div>
              )}
            </div>

            {activeConversation && (
              <div className="flex items-center justify-between gap-3 border-b border-black/15 bg-[#fffdf7] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {renderListingThumb(activeListing)}
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                      Inquiring about
                    </p>
                    <p className="truncate text-sm font-black text-[#17120c]">
                      {activeListingTitle}
                    </p>
                  </div>
                </div>
                {activeListing && (
                  <p className="text-lg font-black">
                    {activeListing.is_free || Number(activeListing.price) === 0
                      ? "FREE"
                      : `$${Number(activeListing.price ?? 0)}`}
                  </p>
                )}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#fffdf7] p-5">
            {purchaseRequests.map((request) => {
  const isSeller = request.seller_id === currentUserId;

  return (
    <div
      key={request.id}
      className="border border-black/25 bg-[#f6efe1] p-4 text-[#17120c]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-black/45">
        {isSeller ? "Order Received" : "Purchase Request Sent"}
      </p>

      <p className="mt-2 text-lg font-black text-[#17120c]">
        ${Number(request.offered_price)}
      </p>

      <p className="mt-1 text-sm text-black/55">
        Status:{" "}
        <span className="font-bold text-[#1f5f35]">
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </p>

{isSeller && request.status === "pending" && (
  <div className="mt-4">
    <p className="mb-3 text-sm text-black/55">
      Buyer wants to purchase this item at full price.
    </p>

    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() =>
          updatePurchaseRequestStatus(request, "accepted")
        }
        className="border border-black bg-[#1f5f35] px-4 py-3 text-sm font-bold text-white"
      >
        Accept
      </button>

      <button
        type="button"
        onClick={() =>
          updatePurchaseRequestStatus(request, "declined")
        }
        className="border border-black bg-[#8a1f1f] px-4 py-3 text-sm font-bold text-white"
      >
        Decline
      </button>
    </div>
  </div>
)}
      {!isSeller && request.status === "pending" && (
        <p className="mt-3 text-sm text-black/55">
          Waiting for seller response.
        </p>
      )}
    </div>
  );
})}
              {!activeConversation ? (
                <p className="text-black/55">Choose a conversation from the left.</p>
              ) : loadingMessages ? (
                <p className="text-black/55">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-black/55">Start the conversation.</p>
              ) : (
                messages.map((message) => {
                  const mine = message.sender_id === currentUserId;
                  return (
                    <div key={message.id} className={`max-w-[78%] ${mine ? "ml-auto" : "mr-auto"}`}>
                      <div
                        className={`border px-4 py-3 shadow-sm ${
                          mine
                            ? "text-white"
                            : "border-black/25 bg-[#fffaf0] text-[#17120c]"
                        }`}
                        style={
                          mine
                            ? { background: "#1f3d6d", borderColor: "#1f3d6d" }
                            : undefined
                        }
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                      <p className="mt-1 px-1 text-[11px] text-black/38">
                        {message.sender_name || "User"} - {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-black/25 bg-[#fffaf0] p-3">
              {otherParticipantBlocked && (
                <p className="border border-black/25 bg-[#f6efe1] px-3 py-2 text-xs text-[#17120c]">
                  You blocked this user. You can unblock them in Settings &gt; Blocked Users.
                </p>
              )}
              {blockedByOtherParticipant && (
                <p className="border border-black/25 bg-[#fff0f0] px-3 py-2 text-xs text-[#8a1f1f]">
                  You cannot send messages in this chat because this user blocked you.
                </p>
              )}
              <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 border border-black/30 bg-white px-4 py-3 text-sm text-[#17120c] outline-none placeholder:text-black/35"
                maxLength={2000}
                disabled={!activeConversation || otherParticipantBlocked || blockedByOtherParticipant}
              />
              <button
                onClick={sendMessage}
                disabled={
                  !activeConversation ||
                  sending ||
                  draft.trim().length === 0 ||
                  otherParticipantBlocked ||
                  blockedByOtherParticipant
                }
                className="inline-flex items-center gap-2 border border-[#17120c] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#1f3d6d" }}
              >
                <Send size={16} />
                Send
              </button>
              </div>
            </div>
          </section>

          <aside className="hidden bg-[#f6efe1] p-4 md:block">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              Item
            </p>
            <div className="border border-black/25 bg-[#fffaf0]">
              <div className="relative aspect-[4/3] bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]">
                {activeListing?.images?.[0] ? (
                  <img src={activeListing.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                    </svg>
                    <span className="absolute bottom-2 left-2 text-[9px] font-bold uppercase tracking-[0.12em] text-black/28">
                      book cover
                    </span>
                  </>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-black italic">{activeListingTitle}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/45">
                  CUNY listing
                </p>
                <button
                  onClick={() => activeConversation && navigate(`/marketplace/${activeConversation.listing_id}`)}
                  disabled={!activeConversation}
                  className="mt-3 w-full border border-black/25 bg-[#fffaf0] px-3 py-1.5 text-xs font-black hover:bg-black hover:text-white disabled:opacity-50"
                >
                  View listing
                </button>
              </div>
            </div>
            <div className="mt-4 border border-black/25 bg-[#fffaf0] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Safety
              </p>
              <p className="mt-2 text-xs leading-5 text-black/58">
                Meet at a public campus spot. Do not share off-platform contact
                details until you are comfortable.
              </p>
            </div>
          </aside>
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

