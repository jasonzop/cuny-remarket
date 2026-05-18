import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Ban,
  Camera,
  ChevronRight,
  Heart,
  LockKeyhole,
  Palette,
  Shield,
  Store,
ShoppingBag,
  UserRound,
} from "lucide-react";
import { useTheme, type ThemePreference } from "../Contexts/ThemeContext";
import { supabase } from "../../supabase-client";

function formatMemberSince(dateString?: string) {
  if (!dateString) return "Unknown";

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function resizeAvatar(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load selected image."));
      img.src = imageUrl;
    });

    const size = 220;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process selected image.");

    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (size - width) / 2;
    const y = (size - height) / 2;

    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, x, y, width, height);

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function SettingRow({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="profile-setting-row group flex w-full items-center gap-4 border border-[#17120c]/25 bg-[#fffaf0] px-4 py-3 text-left transition hover:bg-[#f6efe1]"
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#17120c]/25 bg-[#fffdf7] text-[#17120c]"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm text-gray-500">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#17120c]/40 transition group-hover:text-[#17120c]" />
    </button>
  );
}

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const themeOptions: ThemePreference[] = ["light", "dark", "system"];

  const [userId, setUserId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [campus, setCampus] = useState("");
  const [major, setMajor] = useState("");
  const [majorInput, setMajorInput] = useState("");
const [majors, setMajors] = useState<string[]>([]);
const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  void avatarMessage;
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        navigate("/login");
        return;
      }

      const user = data.session.user;
      const metadata = user.user_metadata || {};

      setUserId(user.id);
      setProfileEmail(user.email ?? "");
      setMemberSince(formatMemberSince(user.created_at));

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, campus, major, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const savedUsername = profile?.username ?? metadata.username ?? "";
      const savedFullName = profile?.full_name ?? metadata.full_name ?? "";
      const savedCampus = profile?.campus ?? metadata.campus ?? "";
      const savedMajor = profile?.major ?? metadata.major ?? "";
      const savedAvatar = profile?.avatar_url ?? metadata.avatar_url ?? "";

      setUsername(savedUsername);
      setCurrentUsername(savedUsername);
      setFullName(savedFullName);
      setCampus(savedCampus);
      setMajor(savedMajor);
      setMajorInput(savedMajor);

const { data: majorData } = await supabase
  .from("majors")
  .select("name")
  .order("name");

if (majorData) {
  setMajors(majorData.map((m) => m.name));
}
      setAvatarUrl(savedAvatar);
    }

    loadProfile();
  }, [navigate]);

  const filteredMajors = useMemo(() => {
  if (!majorInput.trim()) return majors;

  return majors.filter((m) =>
    m.toLowerCase().includes(
      majorInput.toLowerCase()
    )
  );
}, [majorInput, majors]);

  const displayName = fullName || currentUsername || "CUNY Student";
  const profileInitial = (displayName || profileEmail || "C").charAt(0).toUpperCase();

  const section =
    location.pathname === "/profile/security"
      ? "security"
      : location.pathname === "/profile/appearance"
        ? "appearance"
        : location.pathname === "/profile/username"
          ? "username"
          : "home";

  const saveProfile = async (nextAvatarUrl = avatarUrl) => {
    if (!userId) {
      setProfileError("Not logged in.");
      return false;
    }

    if (!username.trim()) {
      setProfileError("Username is required.");
      return false;
    }

    setProfileLoading(true);
    setProfileSaved(false);
    setProfileError(null);

    const cleanUsername = username.trim();
    const cleanFullName = fullName.trim();
    const cleanCampus = campus.trim();
    const cleanMajor = major.trim();

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        username: cleanUsername,
        full_name: cleanFullName,
        campus: cleanCampus,
        major: cleanMajor,
        avatar_url: nextAvatarUrl || "",
      },
    });

    if (authError) {
      setProfileError("Failed to update account: " + authError.message);
      setProfileLoading(false);
      return false;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: cleanUsername,
        full_name: cleanFullName,
        campus: cleanCampus,
        major: cleanMajor,
        avatar_url: nextAvatarUrl || "",
      },
      { onConflict: "id" }
    );

    if (profileError) {
      setProfileError("Failed to save profile: " + profileError.message);
      setProfileLoading(false);
      return false;
    }

    setCurrentUsername(cleanUsername);
    setUsername(cleanUsername);
    setFullName(cleanFullName);
    setCampus(cleanCampus);
    setMajor(cleanMajor);
    setAvatarUrl(nextAvatarUrl || "");
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
    setProfileLoading(false);
    return true;
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setAvatarMessage(null);

    try {
      const resizedAvatar = await resizeAvatar(file);
      setAvatarUrl(resizedAvatar);
      const saved = await saveProfile(resizedAvatar);

      if (saved) {
        setAvatarMessage("Profile photo updated.");
      }
    } catch (error) {
      setAvatarMessage(
        error instanceof Error ? error.message : "Could not update profile photo."
      );
    } finally {
      event.target.value = "";
      setAvatarLoading(false);
    }
  };

  const requirements = [
    { label: "8+ characters", test: newPassword.length >= 8 },
    { label: "Contains a number", test: /\d/.test(newPassword) },
    {
      label: "Contains a special character",
      test: /[@$!%*?&]/.test(newPassword),
    },
  ];

  const passwordInvalid =
    newPassword.length < 8 ||
    !/\d/.test(newPassword) ||
    !/[@$!%*?&]/.test(newPassword) ||
    newPassword !== confirmPassword;

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSavePassword = async () => {
    if (passwordInvalid) return;

    setPasswordLoading(true);
    setPasswordSaved(false);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      alert("Failed to update password: " + error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    }

    setPasswordLoading(false);
  };

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const briq: React.CSSProperties = { fontFamily: "'Bricolage Grotesque', sans-serif" };

  return (
    <div className="paper-profile-page" style={{ minHeight: "100vh", backgroundColor: "#f1eadc", position: "relative" }}>
      {/* Graph paper */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div style={{ display: "flex", position: "relative", zIndex: 1, paddingTop: 80, minHeight: "100vh" }}>
        {/* SIDEBAR */}
        <aside style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.08)", padding: "28px 16px", position: "sticky", top: 80, height: "calc(100vh - 80px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, backgroundColor: "#f2ede4" }}>
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0" }}>
            <button type="button" onClick={() => setShowAvatarPreview(true)} style={{ width: 128, height: 128, borderRadius: "50%", overflow: "hidden", border: "1.5px solid rgba(0,0,0,0.45)", cursor: "pointer", background: "#fffaf0", padding: 0, flexShrink: 0 }}>
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                <div style={{ width: "100%", height: "100%", backgroundImage: "repeating-linear-gradient(45deg,rgba(0,0,0,0.045) 0,rgba(0,0,0,0.045) 1px,transparent 1px,transparent 8px)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.35)", fontWeight: 800, fontSize: 10, ...mono }}>my photo</div>
              )}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarLoading} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, border: "1.5px solid rgba(0,0,0,0.15)", backgroundColor: "#ffffff", color: "#1a1216", ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", opacity: avatarLoading ? 0.6 : 1 }}>
              <Camera size={10} />{avatarLoading ? "Saving..." : "Photo"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div style={{ textAlign: "center" }}>
              <p style={{ ...briq, fontSize: 13, fontWeight: 700, color: "#1a1216", margin: 0 }}>{displayName}</p>
              <p style={{ ...mono, fontSize: 8, color: "rgba(0,0,0,0.4)", margin: "3px 0 0", overflowWrap: "break-word", maxWidth: "100%" }}>{profileEmail}</p>
            </div>
            {(campus || major) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                {campus && <span style={{ ...mono, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: "#e0eaff", color: "#1d4f91" }}>{campus.split(" ")[0]}</span>}
                {major && <span style={{ ...mono, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: "#ede0ff", color: "#512d6d" }}>{major.slice(0, 14)}</span>}
              </div>
            )}
          </div>

          <div style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)" }} />

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {([
              { label: "Profile Info", s: "home", path: "/profile", icon: <UserRound size={13} /> },
              { label: "My Listings", s: "listings", path: "/my-listings", icon: <Store size={13} /> },
              { label: "Saved Items", s: "saved", path: "/saved-items", icon: <Heart size={13} /> },
              { label: "Past Orders", s: "orders", path: "/past-orders", icon: <ShoppingBag size={13} /> },
              { label: "Security", s: "security", path: "/profile/security", icon: <LockKeyhole size={13} /> },
              { label: "Appearance", s: "appearance", path: "/profile/appearance", icon: <Palette size={13} /> },
              { label: "Blocked Users", s: "blocked", path: "/blocked-users", icon: <Ban size={13} /> },
            ] as { label: string; s: string; path: string; icon: React.ReactNode }[]).map(({ label, s, path, icon }) => {
              const active = section === s || (s === "home" && section === "username");
              return (
                <button key={s} type="button" onClick={() => navigate(path)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, border: "none", backgroundColor: active ? "#1a1216" : "transparent", color: active ? "#ffffff" : "#1a1216", ...briq, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.06)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = active ? "#1a1216" : "transparent"; }}
                >{icon}{label}</button>
              );
            })}
          </nav>

          <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            style={{ marginTop: "auto", padding: "9px 10px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", backgroundColor: "transparent", color: "rgba(0,0,0,0.4)", ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", textAlign: "left" }}
          >Sign out</button>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, padding: "40px 56px", maxWidth: 900 }}>
          {/* PLACEHOLDER — sections below */}
          {false && null}

        {section === "home" && (
          <>
            <div className="profile-card border border-[#17120c]/30 bg-[#fffaf0] p-5">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setShowAvatarPreview(true)}
                  className="profile-avatar-shell relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#17120c]/50 bg-[#fffdf7]"
                  title="Open profile photo"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.045)_0,rgba(0,0,0,0.045)_1px,transparent_1px,transparent_8px)] text-[10px] font-bold text-black/35">
                      photo
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-black text-[#17120c]">{displayName}</h1>
                  <p className="mt-1 text-sm italic text-black/60">
                    {campus || "Hunter College"} · {major || "Computer Science"} · senior
                  </p>
                  <p className="mt-2 text-xs text-black/55">
                    ★ 4.9 (28 reviews) · 34 items sold · joined {memberSince}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/profile/username")}
                  className="border border-[#17120c] bg-[#1f3d6d] px-5 py-2 text-xs font-bold text-white"
                >
                  Edit profile
                </button>
                <button className="border border-[#17120c] bg-[#fffdf7] px-5 py-2 text-xs font-bold">
                  ... report
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-6 border-b border-[#17120c]/25 text-xs font-bold">
              <span className="border-b border-[#1f3d6d] pb-2 text-[#1f3d6d]">Listings (8)</span>
              <span className="pb-2">Sold (34)</span>
              <span className="pb-2">Reviews (28)</span>
              <span className="pb-2">About</span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                ["Campbell Biology 12e", "$45", "BIO 100 · HUNTER"],
                ["Calculus: Early Trans.", "$30", "MATH 150 · CCNY"],
                ["Intro to Psychology", "FREE", "PSY 101 · BROOKLYN"],
                ["Norton Anthology Vol B", "$22", "ENG 220 · QUEENS"],
              ].map(([title, price, meta]) => (
                <button key={title} className="border border-[#17120c]/30 bg-[#fffaf0] text-left">
                  <div className="relative aspect-[4/3] bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]">
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] italic text-black/28">
                      book cover
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-bold italic">{title}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black/40">{meta}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-black">{price}</span>
                      <span className="rounded-full border border-[#1f7a3b] bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold text-[#1f5f35]">
                        available
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                icon={<UserRound size={20} />}
                title="Edit Profile"
                description="Add your name, campus, major, and public profile identity."
                onClick={() => navigate("/profile/username")}
              />
              <SettingRow
                icon={<Store size={20} />}
                title="My Listings"
                description="View the marketplace items you have posted."
                onClick={() => navigate("/my-listings")}
              />
              <SettingRow
  icon={<Heart size={20} />}
  title="Saved Items"
  description="View your saved marketplace items."
  onClick={() => navigate("/saved-items")}
/>

<SettingRow
  icon={<ShoppingBag size={20} />}
  title="Past Orders"
  description="View your completed and pending purchases."
  onClick={() =>
    navigate("/past-orders")
  }
/>
              <SettingRow
                icon={<LockKeyhole size={20} />}
                title="Privacy & Security"
                description="Update your password and protect your account."
                onClick={() => navigate("/profile/security")}
              />
              <SettingRow
                icon={<Palette size={20} />}
                title="Appearance"
                description={`Current theme: ${
                  resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)
                }.`}
                onClick={() => navigate("/profile/appearance")}
              />
              <SettingRow
                icon={<Ban size={20} />}
                title="Blocked Users"
                description="Review marketplace users you have blocked."
                onClick={() => navigate("/blocked-users")}
              />
            </div>
          </>
        )}

        {section === "username" && (
          <div className="grid grid-cols-[170px_1fr] gap-6 border border-[#17120c]/25 bg-[#fffaf0] p-4">
            <aside className="border-r border-[#17120c]/25 pr-4">
              <button
                type="button"
                onClick={() => setShowAvatarPreview(true)}
                className="relative h-36 w-36 overflow-hidden rounded-full border border-[#17120c]/50 bg-[#fffdf7]"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.045)_0,rgba(0,0,0,0.045)_1px,transparent_1px,transparent_8px)] text-[10px] font-bold text-black/35">
                    my photo
                  </span>
                )}
              </button>
              <p className="mt-3 text-sm font-black">{displayName}</p>
              <p className="break-all text-[10px] text-black/45">{profileEmail}</p>
            </aside>

            <section>
              <div className="mb-5">
                <h1 className="text-2xl font-black text-[#17120c]">Profile info</h1>
                <p className="text-sm italic text-black/60">This is what other students see.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                  Display name
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      setProfileSaved(false);
                      setProfileError(null);
                    }}
                    className="mt-1 h-9 w-full border border-[#17120c]/40 bg-[#fffdf7] px-3 text-sm normal-case tracking-normal text-[#17120c] outline-none"
                  />
                </label>

                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                  Campus
                  <select
                    value={campus}
                    onChange={(event) => {
                      setCampus(event.target.value);
                      setProfileSaved(false);
                      setProfileError(null);
                    }}
                    className="mt-1 h-9 w-full border border-[#17120c]/40 bg-[#fffdf7] px-3 text-sm normal-case tracking-normal text-[#17120c] outline-none"
                  >
                    <option value="">Select your campus</option>
                    <option value="Hunter College">Hunter College</option>
                    <option value="Baruch College">Baruch College</option>
                    <option value="City College">City College</option>
                    <option value="Queens College">Queens College</option>
                    <option value="Brooklyn College">Brooklyn College</option>
                    <option value="John Jay College">John Jay College</option>
                    <option value="Lehman College">Lehman College</option>
                    <option value="College of Staten Island">College of Staten Island</option>
                    <option value="NYC College of Technology">NYC College of Technology</option>
                    <option value="Other CUNY Campus">Other CUNY Campus</option>
                  </select>
                </label>

                <label className="relative text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                  Major
                  <input
                    type="text"
                    value={majorInput}
                    placeholder="Computer Science"
                    onFocus={() => setShowMajorDropdown(true)}
                    onChange={(event) => {
                      setMajorInput(event.target.value);
                      setMajor(event.target.value);
                      setProfileSaved(false);
                      setProfileError(null);
                      setShowMajorDropdown(true);
                    }}
                    className="mt-1 h-9 w-full border border-[#17120c]/40 bg-[#fffdf7] px-3 text-sm normal-case tracking-normal text-[#17120c] outline-none"
                  />
                  {showMajorDropdown && (
                    <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto border border-[#17120c]/30 bg-[#fffaf0] normal-case tracking-normal">
                      {filteredMajors.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f6efe1]"
                          onClick={() => {
                            setMajor(item);
                            setMajorInput(item);
                            setShowMajorDropdown(false);
                            setProfileSaved(false);
                            setProfileError(null);
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                  Year
                  <input
                    type="text"
                    placeholder="Senior"
                    className="mt-1 h-9 w-full border border-[#17120c]/40 bg-[#fffdf7] px-3 text-sm normal-case tracking-normal text-[#17120c] outline-none"
                  />
                </label>
              </div>

              <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                Short bio (optional)
                <textarea
                  rows={3}
                  placeholder="CS senior. Mostly selling old CS & math books - willing to negotiate."
                  className="mt-1 w-full resize-none border border-[#17120c]/40 bg-[#fffdf7] px-3 py-2 text-sm normal-case tracking-normal text-[#17120c] outline-none"
                />
              </label>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="h-11 w-11 rounded-full border border-[#17120c]/40 bg-[#fffdf7] text-[10px] font-bold"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-[#17120c] bg-[#fffdf7] px-4 py-1.5 text-xs font-bold"
                >
                  Change
                </button>
                <button className="border border-[#17120c] bg-[#fffdf7] px-4 py-1.5 text-xs font-bold">
                  Remove
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border border-[#17120c]/35 bg-[#fffdf7] px-3 py-2 text-xs">
                <span><strong>VERIFIED</strong> CUNY email verified Sep 2025</span>
                <span>✓</span>
              </div>

              {profileError && <p className="mt-3 text-xs text-red-500">{profileError}</p>}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="border border-[#17120c] bg-[#fffdf7] px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveProfile()}
                  disabled={profileLoading || !username.trim()}
                  className="border border-[#17120c] bg-[#1f3d6d] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {profileLoading ? "Saving..." : profileSaved ? "Saved" : "Save changes"}
                </button>
              </div>
            </section>
          </div>
        )}

        {section === "security" && (
          <div className="profile-card rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
              >
                <Shield size={20} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  Privacy & Security
                </h1>
                <p className="text-sm text-gray-500">
                  Update your password whenever you need a fresh start.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  New Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="********"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordSaved(false);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400"
                  >
                    View
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Confirm Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setPasswordSaved(false);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400 ${
                      confirmPassword.length > 0 && confirmPassword !== newPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400"
                  >
                    View
                  </button>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div className="profile-status-panel rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  {requirements.map((req) => (
                    <p
                      key={req.label}
                      className={`text-xs ${req.test ? "text-green-500" : "text-gray-400"}`}
                    >
                      {req.test ? "OK" : "-"} {req.label}
                    </p>
                  ))}
                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-1 text-xs ${
                        passwordsMatch ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleSavePassword}
                disabled={passwordLoading || passwordInvalid}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
              >
                {passwordLoading
                  ? "Saving..."
                  : passwordSaved
                    ? "Password Saved"
                    : "Save Password"}
              </button>
            </div>
          </div>
        )}

        {section === "appearance" && (
          <div className="profile-card rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
              >
                <Palette size={20} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Appearance</h1>
                <p className="text-sm text-gray-500">
                  Choose light, dark, or follow your device settings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const isActive = theme === option;
                return (
                  <button
                    key={option}
                    onClick={() => setTheme(option)}
                    className={`rounded-xl border px-3 py-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-transparent text-white shadow-md"
                        : "profile-secondary-button border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                    style={
                      isActive
                        ? { background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }
                        : undefined
                    }
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Active theme:{" "}
              <span className="font-semibold text-gray-700">
                {resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)}
              </span>
            </p>
          </div>
        )}

        </main>

        {showAvatarPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowAvatarPreview(false)}
          >
            <div
              className="relative flex w-full max-w-5xl flex-col items-center gap-4"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowAvatarPreview(false)}
                className="absolute right-0 top-[-2.25rem] text-sm font-semibold text-white transition hover:opacity-80"
              >
                Close
              </button>

              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Expanded profile avatar"
                  className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              ) : (
                <div
                  className="flex h-72 w-72 items-center justify-center rounded-2xl text-8xl font-black text-white shadow-2xl"
                  style={{
                    background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                  }}
                >
                  {profileInitial}
                </div>
              )}

              <p className="text-center text-sm text-white/85">
                {displayName || "Your profile photo"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
