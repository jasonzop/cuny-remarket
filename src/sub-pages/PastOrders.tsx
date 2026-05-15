import { useEffect, useState } from "react";
import { supabase } from "../../supabase-client";
import { ShoppingBag } from "lucide-react";

type Order = {
  id: string;
  offered_price: number;
  status: string;
  created_at: string;
  marketplace_listings?: {
    title: string;
    campus_location: string | null;
    images: string[] | null;
  } | null;
};

export default function PastOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("marketplace_purchase_requests")
        .select(`
          *,
          marketplace_listings (
            title,
            campus_location,
            images
          )
        `)
        .eq("buyer_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setOrders(data);
      }

      setLoading(false);
    }

    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen px-4 py-28 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag size={32} />
          <h1 className="text-4xl font-black">
            Past Orders
          </h1>
        </div>

        {loading ? (
          <p className="text-slate-300">
            Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-300">
              No orders yet.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Items you buy will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[2rem] border border-cyan-500/20 bg-[#0b1733] p-5"
              >
                <div className="flex gap-5">
                  <img
                    src={
                      order.marketplace_listings
                        ?.images?.[0] ||
                      "https://placehold.co/200x200"
                    }
                    alt=""
                    className="h-28 w-28 rounded-2xl object-cover"
                  />

                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white">
                      {
                        order.marketplace_listings
                          ?.title
                      }
                    </h2>

                    <p className="text-sm text-slate-400 mt-1">
                      Pickup:
                      {" "}
                      {order
                        .marketplace_listings
                        ?.campus_location ||
                        "Not provided"}
                    </p>

                    <p className="text-green-400 text-2xl font-black mt-3">
                      $
                      {Number(
                        order.offered_price
                      )}
                    </p>

                    <div className="mt-4 inline-flex rounded-full bg-[#13284d] px-4 py-2 text-sm font-bold text-cyan-300">
                      {order.status
                        .charAt(0)
                        .toUpperCase() +
                        order.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}