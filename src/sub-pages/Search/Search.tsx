import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase-client";
import {
  CUNY_THEMES,
  DEFAULT_CUNY_THEME,
  getCunyThemeByName,
  type CunyTheme,
} from "../../lib/cunyThemes";
import SearchHeading from "./search-components/SearchHeading";

const recommendedItems = [
  { title: "CS Textbooks", note: "Course books, study guides, old finals" },
  { title: "Graphing Calculators", note: "TI-84s, Casios, finance calculators" },
  { title: "Laptop Accessories", note: "Chargers, sleeves, adapters" },
  { title: "Campus Merch", note: "Hoodies, club shirts, bookstore finds" },
];

const categories = [
  "Textbooks",
  "Electronics",
  "Dorm Essentials",
  "Clothing",
];

const budgetFinds = [
  { label: "Under $10", maxPrice: "10" },
  { label: "Under $25", maxPrice: "25" },
  { label: "Under $50", maxPrice: "50" },
  { label: "Free only", maxPrice: "0" },
];

function CampusBadge({ theme }: { theme: CunyTheme }) {
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black"
      style={{ backgroundColor: theme.accent, color: theme.primary }}
    >
      {theme.badge}
    </span>
  );
}

function Search() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [campusTheme, setCampusTheme] = useState<CunyTheme>(DEFAULT_CUNY_THEME);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadCampusTheme() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setCampusTheme(DEFAULT_CUNY_THEME);
        return;
      }

      let campus = user.user_metadata?.campus ?? "";

      if (!campus) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("campus")
          .eq("id", user.id)
          .maybeSingle();

        campus = profile?.campus ?? "";
      }

      setCampusTheme(getCunyThemeByName(campus));
    }

    loadCampusTheme();
  }, []);

  const campusShortName = useMemo(
    () => campusTheme.name.replace(" College", "").replace("NYC ", ""),
    [campusTheme.name]
  );

  const quickSearch = (query: string) => {
    navigate(`/marketplace?search=${encodeURIComponent(query)}`);
  };

  const goToCategory = (category: string) => {
    navigate(`/marketplace?category=${encodeURIComponent(category)}`);
  };

  const goToCollege = (college: string) => {
    navigate(`/marketplace?college=${encodeURIComponent(college)}`);
  };

  return (
    <section className="min-h-screen overflow-x-hidden bg-[#f1eadc] px-3 pt-24 pb-10 text-[#16120d] sm:px-5">
      <div className="pointer-events-none fixed inset-0 opacity-[0.45] [background-image:linear-gradient(rgba(22,18,13,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(22,18,13,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto max-w-7xl border border-black/20 bg-[#fffaf0] shadow-[12px_12px_0_rgba(22,18,13,0.08)]">
        <div className="flex flex-col gap-3 border-b border-black/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CampusBadge theme={campusTheme} />
            <div>
              <p className="text-sm font-black tracking-tight">CUNY ReMarket</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
                {campusTheme.name} catalog
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <Link className="border-b border-black text-black" to="/marketplace">
              Browse
            </Link>
            <Link className="text-black/55 hover:text-black" to="/marketplace?sell=1">
              Sell
            </Link>
            <Link className="text-black/55 hover:text-black" to="/messages">
              Inbox
            </Link>
            <Link className="text-black/55 hover:text-black" to="/profile">
              Profile
            </Link>
          </div>
        </div>

        <div className="grid min-h-[430px] lg:grid-cols-[0.48fr_0.52fr]">
          <aside
            className="relative overflow-hidden border-b border-black/20 px-6 py-8 text-white lg:border-b-0 lg:border-r"
            style={{
              backgroundColor: campusTheme.primary,
              color: campusTheme.textOnPrimary,
            }}
          >
            <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:100%_8px]" />
            <div className="relative z-10">
              <div
                className="mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ borderColor: campusTheme.accent, color: campusTheme.accent }}
              >
                <CampusBadge theme={campusTheme} />
                Campus first
              </div>

              <SearchHeading
                visible={visible}
                theme={campusTheme}
                campusShortName={campusShortName}
              />

              <div className="mt-10 grid max-w-sm grid-cols-3 gap-5">
                {[
                  ["25", "campuses"],
                  ["$$$", "saved / sem."],
                  ["0", "spam DMs"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <p
                      className="text-2xl font-black leading-none"
                      style={{ color: campusTheme.accent }}
                    >
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="px-6 py-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
              Start with a search
            </p>
            <h2 className="max-w-xl text-3xl font-black tracking-tight md:text-4xl">
              Find books, supplies, and campus stuff without leaving CUNY.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-black/58">
              Search across the marketplace, then filter down to classmates at
              your campus when pickup and trust matter.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput.trim()) {
                    quickSearch(searchInput.trim());
                  }
                }}
                placeholder="intro to psych, calculator, hoodie..."
                className="min-h-12 flex-1 border-2 border-[#16120d] bg-white px-4 text-sm font-semibold text-[#16120d] outline-none placeholder:text-black/35 focus:ring-4"
                style={{ boxShadow: `4px 4px 0 ${campusTheme.accent}` }}
              />
              <button
                onClick={() => {
                  if (!searchInput.trim()) return;
                  quickSearch(searchInput.trim());
                }}
                className="min-h-12 border-2 border-[#16120d] px-8 text-sm font-black text-white transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: campusTheme.primary,
                  boxShadow: `4px 4px 0 ${campusTheme.accent}`,
                }}
              >
                Search
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {recommendedItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => quickSearch(item.title)}
                  className="border border-black/25 bg-[#fffdf7] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(22,18,13,0.12)]"
                >
                  <p className="text-base font-black">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-black/55">{item.note}</p>
                </button>
              ))}
            </div>
          </main>
        </div>

        <div className="grid border-t border-black/20 lg:grid-cols-[220px_1fr]">
          <aside className="border-b border-black/20 bg-[#f6efe1] p-5 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/55">
              Campus lines
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {CUNY_THEMES.slice(0, 8).map((theme) => (
                <button
                  key={theme.slug}
                  onClick={() => goToCollege(theme.name)}
                  className="flex items-center gap-2 border border-black/15 bg-[#fffaf0] px-2 py-2 text-left text-xs font-bold transition hover:border-black/40"
                >
                  <CampusBadge theme={theme} />
                  <span className="truncate">{theme.name.replace(" College", "")}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                  Browse listings
                </p>
                <h2 className="text-2xl font-black">Quick shelves</h2>
              </div>
              <button
                onClick={() => navigate("/marketplace")}
                className="w-fit border border-black px-4 py-2 text-xs font-black transition hover:bg-black hover:text-white"
              >
                View full marketplace
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => goToCategory(category)}
                  className="min-h-36 border border-black/25 bg-[#fffdf7] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(22,18,13,0.12)]"
                >
                  <div className="mb-4 h-20 border border-black/15 bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]" />
                  <p className="text-lg font-black">{category}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/45">
                    Browse shelf
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {budgetFinds.map((price) => (
                <button
                  key={price.label}
                  onClick={() =>
                    navigate(`/marketplace?maxPrice=${price.maxPrice}`)
                  }
                  className="border border-black/25 bg-[#fffdf7] px-4 py-2 text-sm font-black transition hover:-translate-y-0.5"
                  style={{ color: price.maxPrice === "0" ? campusTheme.primary : "#16120d" }}
                >
                  {price.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-black/20 px-5 py-4 text-xs text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <span>Built by students, for students.</span>
          <Link to="/privacy-policy" className="font-bold hover:text-black">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </section>
  );
}

export default Search;
