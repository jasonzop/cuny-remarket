import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase-client";

type Order = {
  id: string;
  offered_price: number;
  status: string;
  created_at: string;
  marketplace_listings?: {
    title: string;
    campus_location: string | null;
  } | null;
};

export default function PastOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("marketplace_purchase_requests")
        .select("*, marketplace_listings(title,campus_location)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      setOrders((data ?? []) as Order[]);
      setLoading(false);
    }

    fetchOrders();
  }, []);

  return (
    <main className="min-h-screen bg-[#f1eadc] pt-20 text-[#17120c]">
      <div className="fixed inset-0 pointer-events-none [background-image:linear-gradient(rgba(23,18,12,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,18,12,0.055)_1px,transparent_1px)] [background-size:24px_24px]" />
      <section className="relative mx-auto max-w-5xl border border-[#17120c]/25 bg-[#fffaf0] p-5">
        <div className="mb-5 flex items-end justify-between border-b border-[#17120c]/25 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Profile</p>
            <h1 className="text-2xl font-black">Sales history</h1>
          </div>
          <button onClick={() => navigate("/profile")} className="border border-[#17120c] px-4 py-2 text-xs font-black">
            Back to profile
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-black/55">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="border border-dashed border-[#17120c]/30 bg-[#fffdf7] p-8 text-sm text-black/55">
            No orders yet. Items you buy will appear here.
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article key={order.id} className="grid grid-cols-[92px_1fr_auto] gap-4 border border-[#17120c]/30 bg-[#fffdf7] p-3">
                <div className="relative aspect-square bg-[repeating-linear-gradient(45deg,#f9f2e5_0,#f9f2e5_8px,#efe5d4_8px,#efe5d4_9px)]">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 50 50" preserveAspectRatio="none">
                    <line x1="0" y1="0" x2="50" y2="50" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-black italic">{order.marketplace_listings?.title || "Listing"}</p>
                  <p className="mt-1 text-xs text-black/55">Pickup: {order.marketplace_listings?.campus_location || "Not provided"}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/38">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">${Number(order.offered_price)}</p>
                  <p className="mt-2 rounded-full border border-[#17120c]/25 px-3 py-1 text-[10px] font-black uppercase">
                    {order.status}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
