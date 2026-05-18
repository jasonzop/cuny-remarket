import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase-client";

type SavedListing = {
  id: string;
  title: string;
  price: number;
  is_free: boolean;
  status: string;
};

function SketchCover() {
  return (
    <div className="relative aspect-[4/3] border-b border-[#17120c]/25 bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] italic text-black/28">
        book cover
      </span>
    </div>
  );
}

export default function SavedItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSavedItems() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_saved_items")
        .select("marketplace_listings(id,title,price,is_free,status)")
        .eq("user_id", user.id);

      if (!error) {
        setItems((data ?? []).map((row: any) => row.marketplace_listings).filter(Boolean));
      }
      setLoading(false);
    }

    loadSavedItems();
  }, []);

  return (
    <main className="min-h-screen bg-[#f1eadc] pt-20 text-[#17120c]">
      <div className="fixed inset-0 pointer-events-none [background-image:linear-gradient(rgba(23,18,12,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,18,12,0.055)_1px,transparent_1px)] [background-size:24px_24px]" />
      <section className="relative mx-auto max-w-6xl border border-[#17120c]/25 bg-[#fffaf0] p-5">
        <div className="mb-5 flex items-end justify-between border-b border-[#17120c]/25 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Profile</p>
            <h1 className="text-2xl font-black">Saved items</h1>
          </div>
          <button onClick={() => navigate("/profile")} className="border border-[#17120c] px-4 py-2 text-xs font-black">
            Back to profile
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-black/55">Loading saved items...</p>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-[#17120c]/30 bg-[#fffdf7] p-8 text-sm text-black/55">
            You have not saved any items yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <Link key={item.id} to={`/marketplace/${item.id}`} className="border border-[#17120c]/30 bg-[#fffaf0] text-left">
                <SketchCover />
                <div className="p-3">
                  <p className="truncate text-sm font-bold italic">{item.title}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">
                    saved listing
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-black">{item.is_free || Number(item.price) === 0 ? "FREE" : `$${Number(item.price)}`}</span>
                    <span className="rounded-full border border-[#1f7a3b] bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold text-[#1f5f35]">
                      {item.status || "saved"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
