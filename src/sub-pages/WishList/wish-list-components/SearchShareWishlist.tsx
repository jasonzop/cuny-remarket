import { useWishlist } from "../../../Contexts/WishListContext";

interface SearchShareWishlistProps {
  visible: boolean;
}

export default function SearchShareWishlist({
  visible,
}: SearchShareWishlistProps) {
  const { searchQuery, setSearchQuery } = useWishlist();

  return (
    <div
      className="relative z-10 mt-6 px-6 flex justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0)"
          : "translateY(10px)",
        transition:
          "opacity .5s ease, transform .5s ease",
      }}
    >
      <input
        type="text"
        placeholder="Search saved items..."
        value={searchQuery}
        onChange={(e) =>
          setSearchQuery(e.target.value)
        }
        className="w-full max-w-2xl px-5 py-3 rounded-2xl text-white placeholder-gray-400 outline-none"
        style={{
          background: "rgba(255,255,255,.08)",
          border:
            "1px solid rgba(255,255,255,.1)",
          backdropFilter: "blur(14px)",
        }}
      />
    </div>
  );
}