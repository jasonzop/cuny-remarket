import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { supabase } from "../../supabase-client";

type SavedListing = {
  id: string;
  title: string;
  price: number;
  is_free: boolean;
  images: string[] | null;
  status: string;
  condition: string;
  seller_name: string | null;
  seller_avatar_url: string | null;
};

function conditionColor(condition: string) {
  switch (condition?.toLowerCase()) {
    case "new": return { bg: "#16a34a", label: "New" };
    case "like new": return { bg: "#ca8a04", label: "Like New" };
    case "good": return { bg: "#2563eb", label: "Good" };
    case "fair": return { bg: "#dc2626", label: "Fair" };
    default: return { bg: "#6b7280", label: condition || "Used" };
  }
}

export default function SavedItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    async function loadSavedItems() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("marketplace_saved_items")
        .select("marketplace_listings(id, title, price, is_free, images, status, condition, seller_name, seller_avatar_url)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Saved items error:", error.message);
        setLoading(false);
        return;
      }

      setItems(
        (data ?? [])
          .map((row: any) => row.marketplace_listings)
          .filter(Boolean) as SavedListing[]
      );
      setLoading(false);
    }

    loadSavedItems();
  }, []);

  const handleUnsave = async (listingId: string) => {
    if (!currentUserId) return;
    setRemovingId(listingId);
    await supabase
      .from("marketplace_saved_items")
      .delete()
      .eq("user_id", currentUserId)
      .eq("listing_id", listingId);
    setItems((prev) => prev.filter((item) => item.id !== listingId));
    setRemovingId(null);
  };

  const handleAddToCart = (item: SavedListing) => {
    navigate("/cart", {
      state: {
        item: {
          id: item.id,
          title: item.title,
          price: item.price,
          images: item.images ?? [],
          category: "Marketplace",
          condition: item.condition,
          seller_name: item.seller_name,
          qty: 1,
          stock: 1,
        },
      },
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "#0b0f1a", paddingTop: 72 }}>
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {/* Header */}
        <div
          className="rounded-3xl p-6 mb-8 flex items-center gap-4"
          style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition flex-shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <ArrowLeft size={18} className="text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Saved Items</h1>
            <p className="text-sm text-slate-400">
              Everything you've hearted from the Marketplace and Wish List.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Heart size={48} className="text-slate-600" />
            <p className="text-slate-400 text-lg font-semibold">No saved items yet.</p>
            <button
              onClick={() => navigate("/marketplace")}
              className="px-6 py-3 rounded-2xl text-white font-bold hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {items.map((item) => {
              const cond = conditionColor(item.condition);
              const displayPrice =
                item.is_free || Number(item.price) === 0
                  ? "Free"
                  : `$${Number(item.price).toFixed(2)}`;

              return (
                <div
                  key={item.id}
                  className="rounded-[2rem] overflow-hidden flex flex-col shadow-lg"
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                    <img
                      src={item.images?.[0] || "https://placehold.co/600x400/1f2937/6b7280?text=No+Image"}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {/* Condition badge */}
                    <span
                      className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: cond.bg }}
                    >
                      {cond.label}
                    </span>
                    {/* Unsave button */}
                    <button
                      onClick={() => handleUnsave(item.id)}
                      disabled={removingId === item.id}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition"
                    >
                      <Heart
                        size={18}
                        fill="#ef4444"
                        stroke="#ef4444"
                        className={removingId === item.id ? "opacity-50" : ""}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-grow">
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xl font-black" style={{ color: "#38bdf8" }}>
                      {displayPrice}
                    </p>

                    {/* Seller row */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
                      >
                        {item.seller_avatar_url ? (
                          <img src={item.seller_avatar_url} alt="Seller" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          (item.seller_name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-slate-400 font-medium">
                        {item.seller_name || "Anonymous"}
                      </span>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={item.status !== "Available"}
                        className="py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 hover:opacity-90 transition"
                        style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => navigate(`/marketplace/${item.id}`)}
                        className="py-3 rounded-xl font-bold text-sm text-white hover:bg-white/10 transition"
                        style={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
