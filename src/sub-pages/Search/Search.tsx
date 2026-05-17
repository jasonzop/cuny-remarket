import { useEffect, useState } from "react";
import { useTheme } from "../../Contexts/ThemeContext";
import SearchHeading from "./search-components/SearchHeading";
import ApplyGradientOrbs from "../SharedComponents/ApplyGradientOrbs";
import { Link, useNavigate } from "react-router-dom";

function Search() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [visible, setVisible] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

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
    <section
      className="min-h-screen overflow-x-hidden transition-colors"
      style={{
        background: isDark ? "#0b0f1a" : "#f0f4ff",
      }}
    >
      <ApplyGradientOrbs />

      <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 pt-20 pb-16">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <SearchHeading visible={visible} />

          {/* Quick Search */}
          <div className="w-full max-w-2xl mt-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search textbooks, merch, calculators..."
                className="flex-1 rounded-2xl border border-cyan-500/20 bg-[#0b1733] px-5 py-4 text-white outline-none placeholder:text-slate-400"
              />

              <button
                onClick={() => {
                  if (!searchInput.trim()) return;
                  quickSearch(searchInput.trim());
                }}
                className="rounded-2xl px-8 py-4 text-white font-bold"
                style={{
                  background:
                    "linear-gradient(90deg,#00AAFF,#6B30FF)",
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Recommended */}
          <div className="w-full mt-12">
            <h2 className="text-2xl font-black text-white mb-5">
              Recommended For You
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "CS Textbooks",
                "Graphing Calculators",
                "Laptop Accessories",
                "Hunter Merch",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => quickSearch(item)}
                  className="rounded-3xl border border-cyan-500/20 bg-[#0b1733]/90 p-6 text-left hover:scale-[1.02] transition"
                >
                  <p className="text-white font-bold text-lg">
                    {item}
                  </p>

                  <p className="text-slate-400 text-sm mt-2">
                    Personalized picks for students
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Shop by Category */}
          <div className="w-full mt-14">
            <h2 className="text-2xl font-black text-white mb-5">
              Browse Categories
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Textbooks",
                "Electronics",
                "Merch",
                "Dorm Essentials",
              ].map((category) => (
                <button
                  key={category}
                  onClick={() => goToCategory(category)}
                  className="rounded-3xl border border-cyan-500/20 bg-[#0b1733]/90 p-8 hover:scale-[1.02] transition"
                >
                  <h3 className="text-white font-bold text-xl">
                    {category}
                  </h3>
                </button>
              ))}
            </div>
          </div>

          {/* Browse by College */}
          <div className="w-full mt-14">
            <h2 className="text-2xl font-black text-white mb-5">
              Browse By College
            </h2>

            <div className="flex flex-wrap gap-3">
              {[
                "Hunter",
                "Baruch",
                "Queens",
                "Brooklyn",
                "John Jay",
                "City College",
              ].map((college) => (
                <button
                  key={college}
                  onClick={() => goToCollege(college)}
                  className="rounded-2xl px-5 py-3 text-white font-semibold"
                  style={{
                    background:
                      "linear-gradient(90deg,#1e3a8a,#4f46e5)",
                  }}
                >
                  {college}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Finds */}
          <div className="w-full mt-14">
            <h2 className="text-2xl font-black text-white mb-5">
              Budget Finds
            </h2>

            <div className="flex flex-wrap gap-3">
              {["Under $10", "Under $25", "Under $50"].map(
                (price) => (
                  <button
                    key={price}
                    onClick={() =>
                      navigate(
                        `/marketplace?maxPrice=${price.replace(
                          /\D/g,
                          ""
                        )}`
                      )
                    }
                    className="rounded-2xl px-5 py-3 text-white font-semibold"
                    style={{
                      background:
                        "linear-gradient(90deg,#059669,#2563eb)",
                    }}
                  >
                    {price}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative z-10 w-full py-10 mt-auto flex justify-center items-center gap-4"
        style={{
          borderTop:
            "1px solid rgba(0,170,255,0.1)",
        }}
      >
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} CUNY ReMarket.
          All rights reserved.
        </p>

        <p className="text-gray-400">•</p>

        <Link
          to="/privacy-policy"
          className="text-xs text-gray-400"
        >
          Privacy Policy
        </Link>
      </div>
    </section>
  );
}

export default Search;