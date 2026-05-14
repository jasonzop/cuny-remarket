import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Camera,
  ChevronRight,
  GraduationCap,
  Heart,
  LockKeyhole,
  Palette,
  Shield,
  Store,
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
      className="profile-setting-row group flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <span
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
        style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm text-gray-500">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300 transition group-hover:text-blue-500" />
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
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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

  const handleCopyWishlistLink = async () => {
    if (!currentUsername.trim()) return;

    const url = `${window.location.origin}/wish-list?user=${encodeURIComponent(
      currentUsername.trim()
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setAvatarMessage("Could not copy link. Please try again.");
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

  const BackButton = () => (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="profile-secondary-button inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <ArrowLeft size={16} />
        Back to Profile
      </button>
      <button
        type="button"
        onClick={() => navigate("/search")}
        className="profile-secondary-button inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Exit Settings
      </button>
    </div>
  );

  return (
    <div className="profile-page min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {section !== "home" && <BackButton />}

        {section === "home" && (
          <>
            <button
              type="button"
              onClick={() => navigate("/search")}
              className="profile-secondary-button inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Back to App
            </button>

            <div className="profile-card overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPreview(true)}
                    className="profile-avatar-shell relative h-24 w-24 overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-inner transition hover:scale-[1.02]"
                    title="Open profile photo"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-3xl font-black text-white"
                        style={{
                          background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                        }}
                      >
                        {profileInitial}
                      </div>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">
                      CUNY ReMarket Profile
                    </p>
                    <h1 className="mt-2 text-3xl font-black leading-tight text-gray-900">
                      {displayName}
                    </h1>
                    <p className="mt-1 break-all text-sm text-gray-500">
                      {profileEmail || "No email found"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        {campus || "Campus not added"}
                      </span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                        {major || "Major not added"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      Member since {memberSince}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                    }}
                  >
                    <Camera size={16} />
                    {avatarLoading ? "Saving..." : "Photo"}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                {avatarMessage && (
                  <p className="mt-4 text-sm text-gray-500">{avatarMessage}</p>
                )}
              </div>
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
                onClick={() => navigate("/marketplace")}
              />
              <SettingRow
                icon={<Heart size={20} />}
                title={copiedLink ? "Wishlist Link Copied" : "Saved Items"}
                description="View or share your saved marketplace items."
                onClick={handleCopyWishlistLink}
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
          <div className="profile-card rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
              >
                <GraduationCap size={20} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  Edit CUNY Profile
                </h1>
                <p className="text-sm text-gray-500">
                  This information appears on your marketplace profile.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Example: jasonz"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setProfileSaved(false);
                    setProfileError(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Example: Jason Parmar"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setProfileSaved(false);
                    setProfileError(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Campus
                </label>
                <select
                  value={campus}
                  onChange={(event) => {
                    setCampus(event.target.value);
                    setProfileSaved(false);
                    setProfileError(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400"
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
              </div>

<div className="relative">
  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
    Major
  </label>

  <input
    type="text"
    value={majorInput}
    placeholder="Search or create major..."
    onFocus={() => setShowMajorDropdown(true)}
    onChange={(event) => {
      setMajorInput(event.target.value);
      setMajor(event.target.value);
      setProfileSaved(false);
      setProfileError(null);
      setShowMajorDropdown(true);
    }}
    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-400"
  />

  {showMajorDropdown && (
    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
      {filteredMajors.map((item) => (
        <button
          key={item}
          type="button"
          className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
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

      {majorInput.trim() &&
        !majors.some(
          (item) => item.toLowerCase() === majorInput.trim().toLowerCase()
        ) && (
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50"
            onClick={async () => {
              const cleanMajor = majorInput.trim();

              const { error } = await supabase
                .from("majors")
                .insert({ name: cleanMajor });

              if (error && error.code !== "23505") {
                setProfileError("Could not create major: " + error.message);
                return;
              }

              setMajors((prev) =>
                prev.some(
                  (item) => item.toLowerCase() === cleanMajor.toLowerCase()
                )
                  ? prev
                  : [...prev, cleanMajor].sort()
              );

              setMajor(cleanMajor);
              setMajorInput(cleanMajor);
              setShowMajorDropdown(false);
              setProfileSaved(false);
              setProfileError(null);
            }}
          >
            + Create "{majorInput.trim()}"
          </button>
        )}
    </div>
  )}
</div>
</div>
            {profileError && <p className="mt-3 text-xs text-red-500">{profileError}</p>}

            <button
              onClick={() => saveProfile()}
              disabled={profileLoading || !username.trim()}
              className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            >
              {profileLoading ? "Saving..." : profileSaved ? "Profile Saved" : "Save Profile"}
            </button>
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