import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase-client";

type BlockedUser = {
  id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  username?: string | null;
};

export default function BlockedUsers() {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(true);
  const [blockedUsersMessage, setBlockedUsersMessage] = useState<string | null>(
    null
  );
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = async (userId: string) => {
    setBlockedUsersLoading(true);
    setBlockedUsersMessage(null);

    const { data, error } = await supabase
      .from("marketplace_user_blocks")
      .select("id, blocked_id, reason, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setBlockedUsersMessage("Could not load blocked users right now.");
      setBlockedUsersLoading(false);
      return;
    }

    const blocks = (data || []) as BlockedUser[];
    if (blocks.length === 0) {
      setBlockedUsers([]);
      setBlockedUsersLoading(false);
      return;
    }

    const blockedIds = blocks.map((row) => row.blocked_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", blockedIds);

    const usernameMap = new Map<string, string>();
    (profilesData || []).forEach(
      (profile: { id: string; username: string | null }) => {
        if (profile.username) usernameMap.set(profile.id, profile.username);
      }
    );

    setBlockedUsers(
      blocks.map((row) => ({
        ...row,
        username: usernameMap.get(row.blocked_id) ?? null,
      }))
    );
    setBlockedUsersLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId) {
        navigate("/login");
        return;
      }

      loadBlockedUsers(userId);
    });
  }, [navigate]);

  const handleUnblockUser = async (blockId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUnblockingId(blockId);
    setBlockedUsersMessage(null);

    const { error } = await supabase
      .from("marketplace_user_blocks")
      .delete()
      .eq("id", blockId)
      .eq("blocker_id", user.id);

    if (error) {
      setBlockedUsersMessage("Could not unblock user. Please try again.");
      setUnblockingId(null);
      return;
    }

    setBlockedUsers((prev) => prev.filter((item) => item.id !== blockId));
    setBlockedUsersMessage("User unblocked.");
    setUnblockingId(null);
  };

  return (
    <main className="min-h-screen bg-[#f1eadc] pt-20 text-[#17120c]">
      <div className="fixed inset-0 pointer-events-none [background-image:linear-gradient(rgba(23,18,12,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,18,12,0.055)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-5 border border-[#17120c]/25 bg-[#fffaf0] p-5">
        <div className="mb-1 flex items-end justify-between border-b border-[#17120c]/25 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Profile</p>
            <h1 className="text-2xl font-black">
              Blocked Users
            </h1>
            <p className="mt-1 text-sm text-black/55">
              Manage sellers you blocked from Marketplace. You can unblock
              anytime.
            </p>
          </div>
          <button onClick={() => navigate("/profile")} className="border border-[#17120c] px-4 py-2 text-xs font-black">
            Back to profile
          </button>
        </div>

            {blockedUsersMessage && (
              <div className="border border-[#17120c]/25 bg-[#fffdf7] px-4 py-3 text-sm text-black/70">
                {blockedUsersMessage}
              </div>
            )}

            {blockedUsersLoading ? (
              <p className="text-sm text-black/55">Loading blocked users...</p>
            ) : blockedUsers.length === 0 ? (
              <div className="border border-dashed border-[#17120c]/30 bg-[#fffdf7] px-4 py-4 text-sm text-black/55">
                You have not blocked anyone yet.
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((blockedUser) => (
                  <div
                    key={blockedUser.id}
                    className="flex flex-col gap-3 border border-[#17120c]/25 bg-[#fffdf7] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-[#17120c]">
                        {blockedUser.username
                          ? `@${blockedUser.username}`
                          : `User ${blockedUser.blocked_id.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-xs text-black/55">
                        Blocked on{" "}
                        {new Date(blockedUser.created_at).toLocaleDateString()}
                      </p>
                      {blockedUser.reason && (
                        <p className="mt-1 text-xs text-black/55">
                          Reason: {blockedUser.reason}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockUser(blockedUser.id)}
                      disabled={unblockingId === blockedUser.id}
                      className="border border-[#17120c] bg-[#fffaf0] px-4 py-2 text-sm font-black text-[#17120c] transition hover:bg-[#17120c] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {unblockingId === blockedUser.id
                        ? "Unblocking..."
                        : "Unblock"}
                    </button>
                  </div>
                ))}
              </div>
            )}
      </div>
    </main>
  );
}
