import { useSearchProducts } from "../search-custom-hooks/searchProducts";
import { useEffect, useRef, useState } from "react";
import { useSearchContext } from "../../../Contexts/useSearchContext";
import SearchInput from "./search-action-components/SearchInput";

interface SearchActionsProps {
  visible: boolean;
}

const CUNY_COLLEGES = [
  "All Colleges",
  "Baruch College",
  "Brooklyn College",
  "City College",
  "College of Staten Island",
  "Hunter College",
  "John Jay College",
  "Lehman College",
  "Queens College",
  "York College",
  "BMCC",
  "Bronx Community College",
  "Hostos Community College",
  "Kingsborough Community College",
  "LaGuardia Community College",
  "Queensborough Community College",
];

export default function SearchActions({ visible }: SearchActionsProps) {
  const [loading, setLoading] = useState(false);
  const [priceFiltersOpen, setPriceFiltersOpen] = useState(false);
  const [collegeOpen, setCollegeOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");

  const pricePanelRef = useRef<HTMLDivElement>(null);
  const collegeRef = useRef<HTMLDivElement>(null);

  const { setOpenPage, minPrice, setMinPrice, maxPrice, setMaxPrice } =
    useSearchContext();

  const searchProducts = useSearchProducts();

  const priceLabel =
    minPrice || maxPrice
      ? `$${minPrice || "0"} - $${maxPrice || "Any"}`
      : "Set Price";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pricePanelRef.current &&
        !pricePanelRef.current.contains(event.target as Node)
      ) {
        setPriceFiltersOpen(false);
      }

      if (
        collegeRef.current &&
        !collegeRef.current.contains(event.target as Node)
      ) {
        setCollegeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="flex items-center justify-center flex-wrap gap-2 z-20 w-full max-w-2xl"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
      }}
    >
      <div className="flex md:flex-col flex-col-reverse gap-3">
        <SearchInput />

        <div className="flex gap-2 w-full justify-center flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchProducts(setLoading, setOpenPage);
            }}
          >
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: "linear-gradient(90deg,#2563eb,#0f172a)",
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="relative" ref={collegeRef}>
            <button
              type="button"
              onClick={() => setCollegeOpen((open) => !open)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 shadow-md"
              style={{
                background: "linear-gradient(90deg,#2563eb,#1e40af)",
              }}
            >
              {selectedCollege} ▾
            </button>

            {collegeOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl border shadow-lg z-50 overflow-hidden"
                style={{
                  background: "rgba(15,23,42,0.96)",
                  borderColor: "rgba(148,163,184,0.25)",
                }}
              >
                {CUNY_COLLEGES.map((college) => (
                  <button
                    key={college}
                    type="button"
                    onClick={() => {
                      setSelectedCollege(college);
                      setCollegeOpen(false);
                      setOpenPage(0);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-600/30 transition"
                    style={{
                      color: selectedCollege === college ? "#93c5fd" : "#e5e7eb",
                    }}
                  >
                    {college}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={pricePanelRef}>
            <button
              type="button"
              onClick={() => setPriceFiltersOpen((open) => !open)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 shadow-md"
              style={{
                background: "linear-gradient(90deg,#2563eb,#1e40af)",
                color: "#fff",
              }}
            >
              {priceLabel}
            </button>

            {priceFiltersOpen && (
              <div
                className="search-price-panel absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 rounded-2xl border shadow-lg flex gap-2 z-50"
                style={{
                  background: "rgba(15,23,42,0.96)",
                  backdropFilter: "blur(16px)",
                  borderColor: "rgba(148,163,184,0.25)",
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setOpenPage(0);
                  }}
                  className="search-price-input w-32 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setOpenPage(0);
                  }}
                  className="search-price-input w-32 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mb-40" />
      </div>
    </div>
  );
}