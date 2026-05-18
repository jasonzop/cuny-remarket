import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const { pathname } = useLocation();

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return null;
  }

  const active = (path: string) =>
    pathname === path || (path === "/marketplace" && pathname.startsWith("/marketplace"));

  return (
    <header className="paper-app-header fixed left-0 right-0 top-0 z-50 border-b border-[#17120c] bg-[#fffaf0]">
      <div className="paper-app-header-inner mx-auto flex h-14 max-w-[1240px] items-center gap-5 px-5">
        <Link to="/marketplace" className="flex items-center gap-2 text-[13px] font-black text-[#17120c]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#17120c] text-[10px]">
            =
          </span>
          CUNY ReMarket
        </Link>

        <div className="relative hidden w-[420px] md:block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs">🔍</span>
          <input
            aria-label="Search"
            placeholder="intro to psych"
            className="paper-app-search h-8 w-full rounded-full border border-[#17120c] bg-[#fffdf7] pl-10 pr-4 text-xs italic text-[#17120c] outline-none placeholder:text-black/35"
          />
        </div>

        <nav className="ml-auto flex items-center gap-4 text-xs font-bold text-[#17120c]">
          <Link className={active("/marketplace") ? "border-b border-[#1f3d6d] text-[#1f3d6d]" : ""} to="/marketplace">
            Browse
          </Link>
          <Link className={pathname === "/sell" ? "border-b border-[#1f3d6d] text-[#1f3d6d]" : ""} to="/sell">
            Sell
          </Link>
          <Link className={pathname.startsWith("/messages") || pathname.startsWith("/marketplace/inbox") ? "border-b border-[#1f3d6d] text-[#1f3d6d]" : ""} to="/messages">
            Inbox
          </Link>
          <Link className={pathname.startsWith("/profile") ? "border-b border-[#1f3d6d] text-[#1f3d6d]" : ""} to="/profile">
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
