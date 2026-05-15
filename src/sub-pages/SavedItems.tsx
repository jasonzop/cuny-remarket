import { useEffect, useState } from "react";
import { supabase } from "../../supabase-client";

type SavedListing = {
  id: string;
  title: string;
  price: number;
  is_free: boolean;
  images: string[] | null;
  status: string;
};

export default function SavedItems() {
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSavedItems() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_saved_items")
        .select("marketplace_listings(*)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Saved items error:", error.message);
        setLoading(false);
        return;
      }

      setItems(
        (data ?? [])
          .map((row: any) => row.marketplace_listings)
          .filter(Boolean)
      );

      setLoading(false);
    }

    loadSavedItems();
  }, []);

  return (
    <div className="min-h-screen px-4 py-28 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-center text-4xl font-black">Saved Items</h1>

        {loading ? (
          <p className="text-center text-slate-300">Loading saved items...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-slate-300">
            You have not saved any items yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-md"
              >
                <div className="mb-4 aspect-square overflow-hidden rounded-2xl bg-slate-800">
                  <img
                    src={
                      item.images?.[0] ||
                      "https://placehold.co/400x400/e2e8f0/64748b?text=No+Image"
                    }
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-300">
                  {item.status}
                </p>

                <h2 className="mb-2 truncate text-xl font-black">
                  {item.title}
                </h2>

                <p className="text-2xl font-semibold">
                  {item.is_free || Number(item.price) === 0
                    ? "Free"
                    : `$${Number(item.price)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}