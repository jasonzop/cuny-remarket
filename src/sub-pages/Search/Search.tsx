import { useEffect, useState } from "react";
import { useSearchContext } from "../../Contexts/useSearchContext";
import { useTheme } from "../../Contexts/ThemeContext";
import DisplayProducts from "./search-components/DisplayProducts";
import SearchHeading from "./search-components/SearchHeading";
import SearchSuggestions from "./search-components/SearchSuggestions";
import ApplyGradientOrbs from "../SharedComponents/ApplyGradientOrbs";
import {
  Link,
  useNavigate,
} from "react-router-dom";

const itemsPerPage = 10;

export const PROMO_TIERS = [
  {
    name: "Basic",
    price: 2.99,
    period: "wk",
    desc: "Top of category",
    highlight: false,
  },
  {
    name: "Featured",
    price: 7.99,
    period: "wk",
    desc: "Homepage spotlight",
    highlight: true,
  },
  {
    name: "Premium",
    price: 14.99,
    period: "wk",
    desc: "Search + category + email",
    highlight: false,
  },
];

/* ---------------- MAIN ---------------- */

function Search() {
  const navigate = useNavigate();
const [searchInput, setSearchInput] = useState("");
const [selectedCollege, setSelectedCollege] = useState("all");
const [showPriceFilter, setShowPriceFilter] = useState(false);
const [minPrice, setMinPrice] = useState("");
const [maxPrice, setMaxPrice] = useState("");
  const { products, openPage, setOpenPage } = useSearchContext();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [visible, setVisible] = useState(false);

  const startIndex = openPage * itemsPerPage;
  const currentProducts = products.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const hasResults = products.length > 0;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  return (
    <section
      className="min-h-screen overflow-x-hidden transition-colors"
      style={{
        background: isDark ? "#0b0f1a" : "#f0f4ff",
      }}
    >
      <ApplyGradientOrbs />

      <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 pt-20 pb-16">
        <div className="flex gap-5 items-start justify-center max-w-5xl mx-auto">
          <div className="flex-1 min-w-0 max-w-xl">
            <SearchHeading visible={visible} />
<div className="flex flex-col items-center gap-4 mt-6">
  <input
    type="text"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    placeholder="Search books, calculators, merch..."
    className="w-full max-w-xl rounded-2xl border border-cyan-500/20 bg-[#0b1733] px-5 py-4 text-white outline-none placeholder:text-slate-400"
  />

  <div className="flex flex-wrap justify-center gap-3">
    <button
onClick={() => {
  const params = new URLSearchParams();

  if (searchInput.trim()) {
    params.set("search", searchInput.trim());
  }

  if (selectedCollege !== "all") {
    params.set("college", selectedCollege);
  }

  if (minPrice.trim()) {
    params.set("minPrice", minPrice.trim());
  }

  if (maxPrice.trim()) {
    params.set("maxPrice", maxPrice.trim());
  }

  navigate(`/marketplace?${params.toString()}`);
}}
      className="rounded-2xl px-8 py-3 text-white font-bold"
      style={{
        background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
      }}
    >
      Search
    </button>

<select
  value={selectedCollege}
  onChange={(e) =>
    setSelectedCollege(e.target.value)
  }
  className="rounded-2xl border border-cyan-500/20 bg-[#0b1733] px-5 py-3 text-white font-bold outline-none"
>
  <option value="all">
    All Colleges
  </option>

  <option value="Hunter">
    Hunter College
  </option>

  <option value="Baruch">
    Baruch College
  </option>

  <option value="City">
    City College
  </option>

  <option value="Queens">
    Queens College
  </option>

  <option value="Brooklyn">
    Brooklyn College
  </option>

  <option value="John Jay">
    John Jay College
  </option>

  <option value="Lehman">
    Lehman College
  </option>

  <option value="Staten Island">
    College of Staten Island
  </option>

  <option value="NYC College of Technology">
    NYC College of Technology
  </option>
</select>

<button
  type="button"
  onClick={() => setShowPriceFilter((prev) => !prev)}
  className="rounded-2xl px-6 py-3 text-white font-bold"
  style={{
    background: "linear-gradient(90deg,#2563eb,#4f46e5)",
  }}
>
  Set Price
</button>
  </div>

  {showPriceFilter && (
  <div className="flex flex-wrap justify-center gap-3">
    <input
      type="number"
      value={minPrice}
      onChange={(e) => setMinPrice(e.target.value)}
      placeholder="Min price"
      className="w-36 rounded-2xl border border-cyan-500/20 bg-[#0b1733] px-4 py-3 text-white outline-none placeholder:text-slate-400"
    />

    <input
      type="number"
      value={maxPrice}
      onChange={(e) => setMaxPrice(e.target.value)}
      placeholder="Max price"
      className="w-36 rounded-2xl border border-cyan-500/20 bg-[#0b1733] px-4 py-3 text-white outline-none placeholder:text-slate-400"
    />
  </div>
)}
</div>
            <SearchSuggestions visible={visible} />

            {hasResults && (
              <>
                <DisplayProducts
                  key={openPage}
                  currentProducts={currentProducts}
                />

                {products.length > itemsPerPage && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setOpenPage(i)}
                        className="w-9 h-9 rounded-xl text-sm font-semibold cursor-pointer"
                        style={{
                          background:
                            openPage === i
                              ? "linear-gradient(90deg, #00AAFF, #6B30FF)"
                              : isDark
                              ? "rgba(39,39,42,0.8)"
                              : "rgba(255,255,255,0.7)",
                          color:
                            openPage === i
                              ? "#fff"
                              : isDark
                              ? "#d4d4d8"
                              : "#6B7280",
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 w-full py-10 mt-auto flex justify-center items-center gap-4"
        style={{ borderTop: "1px solid rgba(0,170,255,0.1)" }}
      >
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} CUNY ReMarket. All rights reserved.
        </p>
        <p className="text-gray-400">•</p>
        <Link to="/privacy-policy" className="text-xs text-gray-400">
          Privacy Policy
        </Link>
      </div>
    </section>
  );
}

export default Search;
