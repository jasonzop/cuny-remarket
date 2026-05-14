import DisplaySortingButtons from "./DisplaySortingButtons";
import SearchShareWishlist from "./SearchShareWishlist";
import WatchlistSummary from "./WatchlistSummary";

interface DisplayWishlistActionsProps {
  visible: boolean;
}

export default function DisplayWishlistActions({
  visible,
}: DisplayWishlistActionsProps) {
  return (
    <>
      <WatchlistSummary visible={visible} />

      <SearchShareWishlist visible={visible} />

      <DisplaySortingButtons visible={visible} />
    </>
  );
}