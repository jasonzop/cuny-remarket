import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../../Contexts/WishListContext";
import ApplyGradientOrbs from "../SharedComponents/ApplyGradientOrbs";
import GreetUser from "../SharedComponents/GreetUser";
import sortWishlist from "./wish-list-hooks/sortWishlist";
import DisplayWishlist from "./wish-list-components/DisplayWishlist";
import DisplayWishlistActions from "./wish-list-components/DisplayWishlistActions";

function WishList() {
  const { items, searchQuery, sortBy, filterDropOnly } =
    useWishlist();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const filteredItems = sortWishlist(
    items,
    filterDropOnly,
    sortBy,
    searchQuery
  );

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{
        background:
          "linear-gradient(135deg,#04152d,#081b3a,#130f45)",
      }}
    >
      <ApplyGradientOrbs />

      <div
        className="sticky top-0 z-30 px-6 py-5 border-b"
        style={{
          backdropFilter: "blur(14px)",
          background: "rgba(0,0,0,0.25)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />

      <GreetUser visible={visible} />

      <div className="mt-6">
        <DisplayWishlistActions visible={visible} />
      </div>

      <DisplayWishlist
        filteredItems={filteredItems}
        visible={visible}
      />

      <div
        className="w-full py-10 mt-auto flex justify-center items-center gap-4"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} CUNY ReMarket
        </p>

        <p className="text-gray-500">•</p>

        <Link
          to="/privacy-policy"
          className="text-xs text-gray-400"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}

export default WishList;