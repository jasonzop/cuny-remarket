import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../supabase-client";
import {
  MapPin,
  Search,
  Plus,
  X,
  Upload,
  Trash2,
  MessageCircle,
  ShieldAlert,
  UserX,
  Pencil,
Heart,
ShoppingBag,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CUNY_THEMES } from "../lib/cunyThemes";

type ItemCategory = {
  id: number;
  name: string;
};



type Department = {
  id: number;
  name: string;
  code: string;
};

type Course = {
  id: number;
  department_id: number;
  code: string;
  name: string;
};

type MarketplaceListing = {
  item_category_id: number | null;
item_categories?: ItemCategory | null;
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  is_free: boolean;
  condition: string;
  images: string[] | null;
  status: "Available" | "Reserved" | "Sold";
  sold: boolean;
  campus_location: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  seller_name: string | null;
seller_avatar_url: string | null;
  department_id: number | null;
  course_id: number | null;
  departments?: Department | null;
  courses?: Course | null;
};

const REPORT_REASONS = [
  { id: "counterfeit", label: "Counterfeit or fake item" },
  { id: "scam", label: "Likely scam or misleading listing" },
  { id: "prohibited", label: "Prohibited or unsafe item" },
  { id: "harassment", label: "Harassment or abusive behavior" },
  { id: "spam", label: "Spam or duplicate listing" },
  { id: "other", label: "Other", requiresDetails: true },
];

const emptyForm = {
  title: "",
  price: "",
  is_free: false,
  description: "",
  item_category_id: "",
categoryInput: "",
  condition: "Good",
  campus_location: "",
  imageInput: "",
  department_id: "",
  course_id: "",
  courseInput: "",
  status: "Available",
  location_name: "",
  latitude: null as number | null,
  longitude: null as number | null,
};

export default function Marketplace({
  myListingsOnly = false,
}: {
  myListingsOnly?: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

const selectedCategoryFromURL =
  searchParams.get("category") || "all";
  const searchFromURL = searchParams.get("search") || "";
const collegeFromURL = searchParams.get("college") || "";
const minPriceFromURL = searchParams.get("minPrice") || "";
const maxPriceFromURL = searchParams.get("maxPrice") || "";
console.log("MIN PRICE:", minPriceFromURL);
console.log("MAX PRICE:", maxPriceFromURL);

  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

const [
  selectedCollegeFilter,
  setSelectedCollegeFilter,
] = useState("all");

  const [courses, setCourses] = useState<Course[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchFromURL);
  const [aiSearching, setAiSearching] =
  useState(false);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  void setSelectedCourseFilter;
  const [minPriceFilter, setMinPriceFilter] = useState("");
const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
  useState(selectedCategoryFromURL);

  const [selectedItem, setSelectedItem] = useState<MarketplaceListing | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceListing | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tempAddress, setTempAddress] = useState("");
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
const [buyLoading, setBuyLoading] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<"" | "New" | "Good" | "Fair">("");
  const [freeItemsOnly, setFreeItemsOnly] = useState(false);
  const [availableNowOnly, setAvailableNowOnly] = useState(true);
  const [sortOrder, setSortOrder] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [departmentInput, setDepartmentInput] = useState("");
const [showDepartmentDropdown, setShowDepartmentDropdown] =
  useState(false);

  const selectedDepartment = useMemo(
    () => departments.find((department) => String(department.id) === formData.department_id),
    [departments, formData.department_id]
  );

  const filteredCourses = useMemo(() => {
    if (!formData.department_id || formData.courseInput.trim().length === 0) {
      return [];
    }

    return courses.filter(
      (course) =>
        String(course.department_id) === formData.department_id &&
        course.code.toLowerCase().includes(formData.courseInput.toLowerCase())
    );
  }, [courses, formData.department_id, formData.courseInput]);
  const filteredDepartments = useMemo(() => {
  if (!departmentInput.trim()) return [];

  return departments.filter((department) =>
    department.name
      .toLowerCase()
      .includes(
        departmentInput.toLowerCase()
      )
  );
}, [departmentInput, departments]);

const filteredItemCategories = useMemo(() => {
  if (!formData.categoryInput.trim()) return [];

  return itemCategories
    .filter((category) =>
      category.name.toLowerCase().includes(formData.categoryInput.toLowerCase())
    )
    .slice(0, 4);
}, [formData.categoryInput, itemCategories]);

const fetchItemCategories = useCallback(async () => {
  const { data, error } = await supabase
    .from("item_categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching item categories:", error.message);
  } else {
    setItemCategories((data ?? []) as ItemCategory[]);
  }
}, []);




  const fetchDepartmentsAndCourses = useCallback(async () => {
    const { data: departmentData, error: departmentError } = await supabase
      .from("departments")
      .select("*")
      .order("name");

if (departmentError) {
  console.error("Error fetching departments:", departmentError.message);
} else {
  console.log("DEPARTMENTS LOADED:", departmentData);
  setDepartments((departmentData ?? []) as Department[]);
}

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .order("code");

    if (courseError) {
      console.error("Error fetching courses:", courseError.message);
    } else {
      setCourses((courseData ?? []) as Course[]);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("marketplace_listings")
      .select("*, departments(*), courses(*), item_categories(*)")
      .neq("status", "Sold");
if (myListingsOnly && currentUserId) {
  query = query.eq("user_id", currentUserId);
}

    if (searchQuery.trim()) {
      query = query.or(
        `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,campus_location.ilike.%${searchQuery.trim()}%`
      );
    }
    if (collegeFromURL) {
  query = query.ilike(
    "campus_location",
    `%${collegeFromURL}%`
  );
}

if (minPriceFromURL) {
  query = query.gte(
    "price",
    Number(minPriceFromURL)
  );
}

if (maxPriceFromURL) {
  query = query.lte(
    "price",
    Number(maxPriceFromURL)
  );
}


if (selectedCollegeFilter !== "all") {
  query = query.ilike(
    "campus_location",
    `%${selectedCollegeFilter}%`
  );
}
if (selectedDepartmentFilter !== "all") {
  query = query.eq(
    "department_id",
    Number(selectedDepartmentFilter)
  );
}

if (minPriceFilter !== "") {
  query = query.gte("price", Number(minPriceFilter));
}

if (maxPriceFilter !== "") {
  query = query.lte("price", Number(maxPriceFilter));
}

if (selectedCourseFilter !== "all") {
  query = query.eq(
    "course_id",
    Number(selectedCourseFilter)
  );
}

if (selectedCategoryFilter !== "all") {
  const category = itemCategories.find(
    (c) =>
      c.name.toLowerCase() ===
      selectedCategoryFilter.toLowerCase()
  );

  if (category) {
    query = query.eq(
      "item_category_id",
      category.id
    );
  }
}

if (conditionFilter === "New") {
  query = query.in("condition", ["New", "Like New"]);
} else if (conditionFilter) {
  query = query.eq("condition", conditionFilter);
}

if (freeItemsOnly) {
  query = query.eq("is_free", true);
}

if (availableNowOnly) {
  query = query.eq("status", "Available");
}

if (sortOrder === "price_asc") {
  query = query.order("price", { ascending: true });
} else if (sortOrder === "price_desc") {
  query = query.order("price", { ascending: false });
} else {
  query = query.order("created_at", { ascending: false });
}

    const { data, error } = await query;

    if (!error && data) {
      setItems(
        (data as MarketplaceListing[]).filter(
          (item) => !blockedSellerIds.includes(item.user_id)
        )
      );
    }

    if (error) console.error("Error fetching listings:", error.message);
    setLoading(false);
}, [
  blockedSellerIds,
  searchQuery,
  selectedCollegeFilter,
  selectedDepartmentFilter,
  selectedCourseFilter,
  minPriceFilter,
maxPriceFilter,
  selectedCategoryFilter,
  itemCategories,
  currentUserId,
  myListingsOnly,
  collegeFromURL,
  minPriceFromURL,
  maxPriceFromURL,
  conditionFilter,
  freeItemsOnly,
  availableNowOnly,
  sortOrder,
]);

useEffect(() => {
  fetchDepartmentsAndCourses();
  fetchItemCategories();
}, [
  fetchDepartmentsAndCourses,
]);
  useEffect(() => {
  if (selectedCategoryFromURL) {
    setSelectedCategoryFilter(
      selectedCategoryFromURL
    );
  }
}, [selectedCategoryFromURL]);
useEffect(() => {
  setSearchQuery(searchFromURL);
}, [searchFromURL]);

  useEffect(() => {
    if (selectedItem && selectedItem.latitude && selectedItem.longitude) {
      const latitude = selectedItem.latitude;
      const longitude = selectedItem.longitude;

      const timer = setTimeout(() => {
        const map = new maplibregl.Map({
          container: "item-map",
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [longitude, latitude],
          zoom: 14,
        });

        new maplibregl.Marker({ color: "#6B30FF" })
          .setLngLat([longitude, latitude])
          .addTo(map);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedItem]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setBlockedSellerIds([]);
      return;
    }


    const fetchBlockedSellers = async () => {
      const { data, error } = await supabase
        .from("marketplace_user_blocks")
        .select("blocked_id")
        .eq("blocker_id", currentUserId);

      if (error) {
        console.error("Error fetching blocked users:", error.message);
        return;
      }

      setBlockedSellerIds(
        (data ?? [])
          .map((row) => row.blocked_id)
          .filter((id): id is string => Boolean(id))
      );
    };

    fetchBlockedSellers();
  }, [currentUserId]);

  useEffect(() => {
  if (!currentUserId) {
    setSavedListingIds([]);
    return;
  }

  const fetchSavedItems = async () => {
    const { data, error } = await supabase
      .from("marketplace_saved_items")
      .select("listing_id")
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error fetching saved items:", error.message);
      return;
    }

    setSavedListingIds(
      (data ?? [])
        .map((row) => row.listing_id)
        .filter(Boolean)
    );
  };

  fetchSavedItems();
}, [currentUserId]);

  useEffect(() => {
    const delayDebounceFN = setTimeout(() => {
      fetchListings();
    }, 300);

    return () => clearTimeout(delayDebounceFN);
  }, [fetchListings]);

  const resetForm = () => {
    setFormData(emptyForm);
    setTempAddress("");
    setEditingItem(null);
    setShowCourseDropdown(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsPostModalOpen(true);
  };
  void openCreateModal;

  const openEditModal = (item: MarketplaceListing) => {
    setEditingItem(item);
    setFormData({
      item_category_id: item.item_category_id ? String(item.item_category_id) : "",
categoryInput: item.item_categories?.name ?? "",
      title: item.title ?? "",
      price: item.price ? String(item.price) : "",
      is_free: item.is_free ?? item.price === 0,
      description: item.description ?? "",
      condition: item.condition ?? "Good",
      campus_location: item.campus_location ?? "",
      imageInput: item.images?.[0] ?? "",
      department_id: item.department_id ? String(item.department_id) : "",
      course_id: item.course_id ? String(item.course_id) : "",
      courseInput: item.courses?.code ?? "",
      status: item.status ?? "Available",
      location_name: item.location_name ?? "",
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setTempAddress(item.location_name ?? "");
    setSelectedItem(null);
    setIsPostModalOpen(true);
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        imageInput: String(reader.result),
      }));
    };

    reader.readAsDataURL(file);
  };
const handleCreateCategory = async () => {
  const cleanCategory = formData.categoryInput.trim();
  if (!cleanCategory) return;

  const { data, error } = await supabase
    .from("item_categories")
    .insert({ name: cleanCategory })
    .select("*")
    .single();

  if (error && error.code !== "23505") {
    alert("Could not create category: " + error.message);
    return;
  }

  if (data) {
    const newCategory = data as ItemCategory;

    setItemCategories((prev) =>
      prev.some(
        (category) =>
          category.name.toLowerCase() === newCategory.name.toLowerCase()
      )
        ? prev
        : [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
    );

    setFormData((prev) => ({
      ...prev,
      item_category_id: String(newCategory.id),
      categoryInput: newCategory.name,
    }));
  }

  setShowCategoryDropdown(false);
  fetchItemCategories();
};
  const handleCreateCourse = async () => {
    if (!selectedDepartment) return;

    const typed = formData.courseInput.trim().toUpperCase();
    if (!typed) return;

    const courseCode = typed.startsWith(selectedDepartment.code)
      ? typed
      : `${selectedDepartment.code} ${typed}`;

    const { data, error } = await supabase
      .from("courses")
      .insert({
        department_id: selectedDepartment.id,
        code: courseCode,
        name: courseCode,
      })
      .select("*")
      .single();

    if (error && error.code !== "23505") {
      alert("Could not create course: " + error.message);
      return;
    }

    if (data) {
      const newCourse = data as Course;
      setCourses((prev) =>
        prev.some((course) => course.id === newCourse.id)
          ? prev
          : [...prev, newCourse].sort((a, b) => a.code.localeCompare(b.code))
      );

      setFormData((prev) => ({
        ...prev,
        course_id: String(newCourse.id),
        courseInput: newCourse.code,
      }));
    } else {
      const { data: existingCourse } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", selectedDepartment.id)
        .eq("code", courseCode)
        .single();

      if (existingCourse) {
        setFormData((prev) => ({
          ...prev,
          course_id: String(existingCourse.id),
          courseInput: existingCourse.code,
        }));
      }
    }

    setShowCourseDropdown(false);
    fetchDepartmentsAndCourses();
    fetchItemCategories();
  };

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return alert("You must be logged in to post.");

    if (!formData.department_id) {
      alert("Please select a department.");
      return;
    }

    if (!formData.course_id) {
      alert("Please select or create a course.");
      return;
    }

    const numericPrice = formData.is_free
      ? 0
      : formData.price === ""
        ? 0
        : parseInt(formData.price.replace(/[^0-9]/g, "")) || 0;

        const sellerName =
  user.user_metadata?.name ||
  user.user_metadata?.full_name ||
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  "Unknown Seller";

  const sellerAvatar =
  user.user_metadata?.avatar_url || null;

    const payload = {
      item_category_id: Number(formData.item_category_id),
      user_id: user.id,
  seller_name: sellerName,
  seller_avatar_url: sellerAvatar,
  title: formData.title.trim(),
      description: formData.description.trim(),
      price: numericPrice,
      is_free: formData.is_free,
      condition: formData.condition,
      department_id: Number(formData.department_id),
      course_id: Number(formData.course_id),
      campus_location: formData.campus_location.trim(),
      images: formData.imageInput ? [formData.imageInput] : [],
      status: formData.status,
      sold: formData.status === "Sold",
      location_name: formData.location_name,
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("marketplace_listings")
        .update(payload)
        .eq("id", editingItem.id);

      if (error) {
        alert("Error updating listing: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("marketplace_listings").insert([payload]);

      if (error) {
        alert("Error posting: " + error.message);
        return;
      }
    }

    setIsPostModalOpen(false);
    resetForm();
    fetchListings();
  };

  const handleAddressLookup = async (address: string) => {
    if (address.length < 5) return;

    const API_KEY = import.meta.env.VITE_GEOCODIO_KEY;

    const res = await fetch(
      `https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(
        address
      )}&api_key=${API_KEY}`
    );

    const data = await res.json();

    if (data.results?.length > 0) {
      const result = data.results[0];

      setFormData({
        ...formData,
        location_name: result.formatted_address,
        latitude: result.location.lat,
        longitude: result.location.lng,
      });
    }
  };

  const handleDeleteListing = async (itemId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", itemId);

    if (error) alert("Error deleting listing: " + error.message);
    else {
      setSelectedItem(null);
      fetchListings();
    }
  };

  const handleUpdateStatus = async (
    itemId: string,
    status: "Available" | "Reserved" | "Sold"
  ) => {
    const { error } = await supabase
      .from("marketplace_listings")
      .update({
        status,
        sold: status === "Sold",
      })
      .eq("id", itemId);

    if (error) {
      alert("Could not update status: " + error.message);
      return;
    }

    setSelectedItem(null);
    fetchListings();
  };

  const requireSignedIn = () => {
    if (loggedIn && currentUserId) return true;
    alert("Please log in first.");
    return false;
  };

  const handleOpenMessage = async () => {
    if (!selectedItem || !requireSignedIn()) return;

    if (currentUserId === selectedItem.user_id) {
      navigate("/marketplace/inbox");
      return;
    }

    if (blockedSellerIds.includes(selectedItem.user_id)) {
      setActionMessage("You blocked this seller. Unblock them before messaging.");
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionMessage("Please log in first.");
      setActionLoading(false);
      return;
    }

    const { data: existingConversation, error: findError } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("listing_id", selectedItem.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", selectedItem.user_id)
      .maybeSingle();

    if (findError) {
      setActionMessage("Could not start conversation: " + findError.message);
      setActionLoading(false);
      return;
    }

    let conversationId = existingConversation?.id as string | undefined;

    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from("marketplace_conversations")
        .insert({
          listing_id: selectedItem.id,
          buyer_id: user.id,
          seller_id: selectedItem.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (conversationError) {
        setActionMessage("Could not create conversation: " + conversationError.message);
        setActionLoading(false);
        return;
      }

      conversationId = newConversation.id;
    }

    setBuyLoading(false);
setIsBuyModalOpen(false);
setSelectedItem(null);

alert("Purchase request sent successfully! It was added to Past Orders.");

fetchListings();
  };

const handleBuyNow = async () => {
  if (!selectedItem || !requireSignedIn()) return;

  try {
    setBuyLoading(true);
    setActionMessage(null);

    if (currentUserId === selectedItem.user_id) {
      alert("You cannot buy your own listing.");
      return;
    }

    if (selectedItem.status !== "Available") {
      alert("This item is not available right now.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Please log in first.");
      return;
    }

    let conversationId: string | undefined;

    const { data: existingConversation, error: findError } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("listing_id", selectedItem.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", selectedItem.user_id)
      .maybeSingle();

    if (findError) {
      alert("Could not check conversation: " + findError.message);
      return;
    }

    conversationId = existingConversation?.id;

    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from("marketplace_conversations")
        .insert({
          listing_id: selectedItem.id,
          buyer_id: user.id,
          seller_id: selectedItem.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (conversationError || !newConversation?.id) {
        alert("Could not create conversation: " + conversationError?.message);
        return;
      }

      conversationId = newConversation.id;
    }

    const { error: requestError } = await supabase
      .from("marketplace_purchase_requests")
      .insert({
        listing_id: selectedItem.id,
        conversation_id: conversationId,
        buyer_id: user.id,
        seller_id: selectedItem.user_id,
        offered_price: Number(selectedItem.price || 0),
        status: "pending",
      });

    if (requestError) {
      alert("Could not create purchase request: " + requestError.message);
      return;
    }

    const buyerName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "A buyer";

    const { error: messageError } = await supabase
      .from("marketplace_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: buyerName,
        body: `🛍️ Purchase Request: ${buyerName} wants to buy "${selectedItem.title}" for ${formatPrice(
          selectedItem
        )}.`,
      });

    if (messageError) {
      alert("Request saved, but message failed: " + messageError.message);
    }

    await supabase
      .from("marketplace_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    setIsBuyModalOpen(false);
    setSelectedItem(null);
    setActionMessage(
      "Purchase request sent successfully. It was added to Past Orders."
    );

    alert("Purchase request sent successfully! It was added to Past Orders.");

    fetchListings();
  } finally {
    setBuyLoading(false);
  }
};

const handleToggleSave = async () => {
  if (!selectedItem || !requireSignedIn()) return;

  const alreadySaved = savedListingIds.includes(selectedItem.id);

  if (alreadySaved) {
    const { error } = await supabase
      .from("marketplace_saved_items")
      .delete()
      .eq("user_id", currentUserId)
      .eq("listing_id", selectedItem.id);

    if (error) {
      alert("Could not remove saved item.");
      return;
    }

setSavedListingIds((prev) =>
  prev.includes(selectedItem.id)
    ? prev.filter((id) => id !== selectedItem.id)
    : [...prev, selectedItem.id]
);

    return;
  }

const { error } = await supabase
  .from("marketplace_saved_items")
  .upsert(
    {
      user_id: currentUserId,
      listing_id: selectedItem.id,
    },
    { onConflict: "user_id,listing_id" }
  );

  if (error) {
    alert("Could not save item.");
    return;
  }

  setSavedListingIds((prev) => [...prev, selectedItem.id]);
};
  const handleBlockSeller = async () => {
    if (!selectedItem || !requireSignedIn()) return;

    if (currentUserId === selectedItem.user_id) {
      setActionMessage("You cannot block yourself.");
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    setBlockMessage(null);

    const { error } = await supabase.from("marketplace_user_blocks").upsert(
      {
        blocker_id: currentUserId,
        blocked_id: selectedItem.user_id,
        reason: "Blocked seller messages",
      },
      { onConflict: "blocker_id,blocked_id" }
    );

    if (error) {
      setBlockMessage("Could not block seller: " + error.message);
      setActionLoading(false);
      return;
    }

    setBlockedSellerIds((ids) => [...new Set([...ids, selectedItem.user_id])]);
    setItems((existing) =>
      existing.filter((item) => item.user_id !== selectedItem.user_id)
    );

    setSelectedItem(null);
    setIsBlockModalOpen(false);
    setActionMessage("Seller blocked.");
    setActionLoading(false);
  };

  const handleReportListing = async () => {
    if (!selectedItem || !requireSignedIn()) return;

    const selectedReason = REPORT_REASONS.find(
      (reason) => reason.id === reportReason
    );

    if (!selectedReason) {
      setReportMessage("Please select a reason.");
      return;
    }

    const details = reportDetails.trim();

    if (
      selectedReason.requiresDetails &&
      (details.length < 3 || details.length > 500)
    ) {
      setReportMessage("For 'Other', add details between 3 and 500 characters.");
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    setReportMessage(null);

    const { error } = await supabase
      .from("marketplace_listing_reports")
      .insert({
        reporter_id: currentUserId,
        seller_id: selectedItem.user_id,
        listing_id: selectedItem.id,
        reason: selectedReason.label,
        details: details || null,
      });

    if (error) {
      setReportMessage("Could not submit report: " + error.message);
      setActionLoading(false);
      return;
    }

    setReportDetails("");
    setReportReason("");
    setIsReportModalOpen(false);
    setActionMessage("Report submitted. Thanks for helping keep CUNY ReMarket safe.");
    setActionLoading(false);
  };

  const formatPrice = (item: MarketplaceListing) =>
    item.is_free || Number(item.price) === 0 ? "Free" : `$${Number(item.price)}`;
  const handleAISearch = async () => {
  if (!searchQuery.trim()) return;

  try {
    setAiSearching(true);

    const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/ai-search`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      }
    );

    const aiData =
      await response.json();

    console.log(
      "AI SEARCH:",
      aiData
    );

    if (aiData.department) {
      const matchingDepartment =
        departments.find(
          (department) =>
            department.name
              .toLowerCase()
              .includes(
                aiData.department.toLowerCase()
              )
        );

      if (matchingDepartment) {
        setSelectedDepartmentFilter(
          String(
            matchingDepartment.id
          )
        );
      }
    }

    if (aiData.college) {
      setSelectedCollegeFilter(
        aiData.college
      );
    }
if (aiData.department) {
  setSearchQuery("");
} else {
  setSearchQuery(searchQuery);
}
console.log("AI SEARCH:", aiData);
alert(
  "AI understood your search:\n\n" +
  JSON.stringify(aiData, null, 2)
);
  } catch (error) {
    console.error(
      "AI Search failed",
      error
    );
    alert(
      "AI search failed."
    );
  } finally {
    setAiSearching(false);
  }
};

  const formPriceLabel = formData.is_free ? "Free" : "Price";

  const [sidebarCourseQuery, setSidebarCourseQuery] = useState("");
  const displayItems = useMemo(() => {
    if (!sidebarCourseQuery.trim()) return items;
    const q = sidebarCourseQuery.toLowerCase();
    return items.filter(item =>
      item.courses?.code?.toLowerCase().includes(q) ||
      item.departments?.name?.toLowerCase().includes(q)
    );
  }, [items, sidebarCourseQuery]);

  return (
    <div className="paper-marketplace-page" style={{ minHeight: "100vh", backgroundColor: "#f1eadc", position: "relative" }}>
      {/* Graph paper background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* Sidebar + main layout */}
      <div style={{ display: "flex", position: "relative", zIndex: 1, paddingTop: 78, minHeight: "100vh" }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width: 272, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.28)", padding: "32px 16px", position: "sticky", top: 78, height: "calc(100vh - 78px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 22, backgroundColor: "#f2ede4" }}>

          {loggedIn && (
            <button onClick={() => navigate("/sell")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "2px solid #1a1216", backgroundColor: "#1a1216", color: "#ffffff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 rgba(0,0,0,0.25)" }}>
              <Plus size={14} /> List something
            </button>
          )}

          {/* Campus */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 10 }}>Campus</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: selectedCollegeFilter === "all" ? 700 : 500, color: "#1a1216" }}>
                <input type="radio" name="campus" checked={selectedCollegeFilter === "all"} onChange={() => setSelectedCollegeFilter("all")} style={{ accentColor: "#1a1216" }} /> All CUNY
              </label>
              {CUNY_THEMES.filter(t => t.slug !== "other-cuny").map(t => (
                <label key={t.slug} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: selectedCollegeFilter === t.short ? 700 : 500, color: "#1a1216" }}>
                  <input type="radio" name="campus" checked={selectedCollegeFilter === t.short} onChange={() => setSelectedCollegeFilter(t.short)} style={{ accentColor: "#1a1216" }} /> {t.short}
                </label>
              ))}
            </div>
          </div>

          {/* Course / Dept */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 8 }}>Course / Dept</p>
            <input type="text" placeholder="e.g. PSY 101" value={sidebarCourseQuery} onChange={e => setSidebarCourseQuery(e.target.value)} style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 6, backgroundColor: "#ffffff", padding: "8px 10px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 500, color: "#1a1216", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Price */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 8 }}>Price</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" min="0" placeholder="$0" value={minPriceFilter} onChange={e => setMinPriceFilter(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "50%", border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 6, backgroundColor: "#ffffff", padding: "8px 10px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <input type="number" min="0" placeholder="$500" value={maxPriceFilter} onChange={e => setMaxPriceFilter(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "50%", border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 6, backgroundColor: "#ffffff", padding: "8px 10px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Condition */}
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 8 }}>Condition</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(["any", "New", "Good", "Fair"] as const).map(c => {
                const active = c === "any" ? conditionFilter === "" : conditionFilter === c;
                return (
                  <button key={c} onClick={() => setConditionFilter(c === "any" ? "" : c)} style={{ padding: "4px 12px", borderRadius: 999, border: `1.5px solid ${active ? "#1a1216" : "rgba(0,0,0,0.18)"}`, backgroundColor: active ? "#1a1216" : "#ffffff", color: active ? "#ffffff" : "#1a1216", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free / Available */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 500, color: "#1a1216" }}>
              <input type="checkbox" checked={freeItemsOnly} onChange={e => setFreeItemsOnly(e.target.checked)} style={{ accentColor: "#1a1216", width: 14, height: 14 }} /> Free items only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 500, color: "#1a1216" }}>
              <input type="checkbox" checked={availableNowOnly} onChange={e => setAvailableNowOnly(e.target.checked)} style={{ accentColor: "#1a1216", width: 14, height: 14 }} /> Available now
            </label>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: "34px 38px", minWidth: 0 }}>

          {/* Search + AI */}
          <div style={{ display: "flex", gap: 12, marginBottom: 22, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.35)", pointerEvents: "none" }} />
              <input type="text" placeholder="Search listings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: "100%", height: 44, border: "1.5px solid rgba(0,0,0,0.28)", borderRadius: 0, backgroundColor: "#fffdf7", padding: "10px 14px 10px 36px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 600, color: "#1a1216", outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleAISearch} disabled={aiSearching} style={{ display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 18px", borderRadius: 0, border: "1.5px solid #1a1216", background: "#1f3d6d", color: "#ffffff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 800, cursor: aiSearching ? "not-allowed" : "pointer", opacity: aiSearching ? 0.7 : 1, whiteSpace: "nowrap", boxShadow: "3px 3px 0 rgba(0,0,0,0.14)" }}>
              ✨ {aiSearching ? "Thinking..." : "AI Search"}
            </button>
          </div>

          {/* Heading + result count + sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: "#1a1216", margin: 0 }}>
                {myListingsOnly ? "My Listings" : "Browse listings"}
              </h1>
              {!loading && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.38)" }}>
                  {displayItems.length} results
                </span>
              )}
            </div>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "newest" | "price_asc" | "price_desc")} style={{ border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 6, backgroundColor: "#ffffff", padding: "7px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "#1a1216", outline: "none", cursor: "pointer" }}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
          </div>

          {actionMessage && (
            <div style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, backgroundColor: "#ffffff", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, color: "#1a1216" }}>{actionMessage}</div>
          )}

          {/* Listing grid */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240 }}>
              <div style={{ width: 36, height: 36, border: "3px solid rgba(0,0,0,0.1)", borderTop: "3px solid #1a1216", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : displayItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, color: "rgba(0,0,0,0.4)" }}>No listings found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {displayItems.map(item => (
                <div key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)}
                  style={{ backgroundColor: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", overflow: "hidden" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "3px 3px 0 rgba(0,0,0,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  {/* Book cover */}
                  <div style={{ aspectRatio: "4/3", backgroundColor: "#f7f0e4", position: "relative", overflow: "hidden", backgroundImage: "repeating-linear-gradient(45deg,rgba(0,0,0,0.055) 0,rgba(0,0,0,0.055) 1px,transparent 1px,transparent 8px)" }}>
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <>
                        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 75" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
                        </svg>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.26)", textTransform: "lowercase", letterSpacing: "0.02em" }}>book cover</span>
                      </>
                    )}
                  </div>
                  {/* Card info */}
                  <div style={{ padding: "10px 12px 12px" }}>
                    <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, fontStyle: "italic", color: "#1a1216", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</h3>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.38)", margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: "0.08em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.courses?.code || "–"} · {item.campus_location?.split(" ")[0]?.toUpperCase() || "CUNY"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 800, color: "#1a1216" }}>{formatPrice(item)}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 999, backgroundColor: item.status === "Available" ? "#d1fae5" : "#f1f5f9", color: item.status === "Available" ? "#065f46" : "#475569", border: `1px solid ${item.status === "Available" ? "#6ee7b7" : "#cbd5e1"}` }}>
                        {item.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "center", gap: 16 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(0,0,0,0.28)" }}>© {new Date().getFullYear()} CUNY ReMarket</span>
            <span style={{ color: "rgba(0,0,0,0.2)" }}>·</span>
            <Link to="/privacy-policy" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(0,0,0,0.28)", textDecoration: "none" }}>Privacy Policy</Link>
          </div>
        </main>
      </div>


      {isPostModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="marketplace-modal bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
            <div
              className="h-1.5 w-full"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            />
            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  {editingItem ? "Edit Listing" : "List an Item"}
                </h2>
                <button
                  onClick={() => {
                    setIsPostModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handlePostItem} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <div className="relative flex flex-col gap-1.5">
  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
    Category
  </label>

  <input
    required
    type="text"
    placeholder="Search or create category..."
    value={formData.categoryInput}
    onFocus={() => {
      if (formData.categoryInput.trim()) setShowCategoryDropdown(true);
    }}
    onChange={(e) => {
      setFormData({
        ...formData,
        categoryInput: e.target.value,
        item_category_id: "",
      });
      setShowCategoryDropdown(e.target.value.trim().length > 0);
    }}
    className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
  />

  {showCategoryDropdown && formData.categoryInput.trim() && (
    <div className="absolute top-full z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
      {filteredItemCategories.map((category) => (
        <button
          key={category.id}
          type="button"
          className="block w-full px-4 py-3 text-left text-sm text-gray-200 bg-[#071326] hover:bg-[#13284d]"
          onClick={() => {
            setFormData({
              ...formData,
              item_category_id: String(category.id),
              categoryInput: category.name,
            });
            setShowCategoryDropdown(false);
          }}
        >
          {category.name}
        </button>
      ))}

      {!itemCategories.some(
        (category) =>
          category.name.toLowerCase() ===
          formData.categoryInput.trim().toLowerCase()
      ) && (
        <button
          type="button"
          className="block w-full px-4 py-3 text-left text-sm font-semibold text-cyan-300 bg-[#071326] hover:bg-[#13284d]"
          onClick={handleCreateCategory}
        >
          + Create "{formData.categoryInput.trim()}"
        </button>
      )}
    </div>
  )}
</div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Title
                  </label>
                  <input
                    required
                    placeholder="What are you selling?"
                    className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                      {formPriceLabel}
                    </label>
                    <input
                      required={!formData.is_free}
                      disabled={formData.is_free}
type="number"
step="1"
min="0"
placeholder="0"
className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none disabled:opacity-50"
value={formData.price}
onChange={(e) =>
  setFormData({
    ...formData,
    price: e.target.value.replace(/[^0-9]/g, ""),
  })
}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                      Price Type
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          is_free: !prev.is_free,
                          price: !prev.is_free ? "" : prev.price,
                        }))
                      }
                      className={`w-full px-4 py-3 rounded-xl border font-bold ${
                        formData.is_free
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {formData.is_free ? "Free" : "Paid"}
                    </button>
                  </div>
                </div>

<div className="relative flex flex-col gap-1.5">
  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
    Department
  </label>

  <input
    type="text"
    placeholder="Search department..."
    value={departmentInput}
    onFocus={() =>
      setShowDepartmentDropdown(true)
    }
    onChange={(e) => {
      setDepartmentInput(e.target.value);

      setFormData({
        ...formData,
        department_id: "",
        course_id: "",
        courseInput: "",
      });

      setShowDepartmentDropdown(true);
    }}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
  />

  {showDepartmentDropdown && (
    <div className="absolute top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
{filteredDepartments.length === 0 && (
<div className="px-4 py-3 text-sm text-slate-300">
  No departments found
</div>
)}
      {filteredDepartments.map(
        (department) => (
          <button
            key={department.id}
            type="button"
            className={`block w-full px-4 py-3 text-left text-sm transition
${
  departmentInput === department.name
    ? "bg-blue-600 text-white"
    : "bg-[#071326] text-gray-200 hover:bg-[#13284d]"
}`}
            onClick={() => {
              setDepartmentInput(
                department.name
              );

              setFormData({
                ...formData,
                department_id: String(
                  department.id
                ),
                course_id: "",
                courseInput: "",
              });

              setShowDepartmentDropdown(
                false
              );
            }}
          >
            {department.name}
          </button>
        )
      )}
    </div>
  )}
</div>

                <div className="relative flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Course
                  </label>
                  <input
                    required
                    disabled={!formData.department_id}
                    placeholder={
                      selectedDepartment
                        ? `Search ${selectedDepartment.code} course...`
                        : "Select department first"
                    }
                    className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none disabled:opacity-50"
                    value={formData.courseInput}
                    onFocus={() => {
                      if (formData.courseInput.trim()) setShowCourseDropdown(true);
                    }}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        courseInput: e.target.value,
                        course_id: "",
                      });
                      setShowCourseDropdown(e.target.value.trim().length > 0);
                    }}
                  />

                  {showCourseDropdown &&
                    formData.department_id &&
                    formData.courseInput.trim() && (
                      <div className="absolute z-30 top-full mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
                        {filteredCourses.map((course) => (
                          <button
                            key={course.id}
                            type="button"
                            className="block w-full px-4 py-3 text-left text-sm text-gray-200 bg-[#071326] hover:bg-[#13284d]"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                course_id: String(course.id),
                                courseInput: course.code,
                              });
                              setShowCourseDropdown(false);
                            }}
                          >
                            {course.code}
                          </button>
                        ))}

                        {!filteredCourses.some(
                          (course) =>
                            course.code.toLowerCase() ===
                            formData.courseInput.trim().toLowerCase()
                        ) && (
                          <button
                            type="button"
                            className="block w-full px-4 py-3 text-left text-sm font-semibold text-cyan-300 bg-[#071326] hover:bg-[#13284d]"
                            onClick={handleCreateCourse}
                          >
                            + Create{" "}
                            {selectedDepartment?.code}{" "}
                            {formData.courseInput
                              .replace(selectedDepartment?.code || "", "")
                              .trim()
                              .toUpperCase()}
                          </button>
                        )}
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                      Condition
                    </label>
                    <select
                      className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                      value={formData.condition}
                      onChange={(e) =>
                        setFormData({ ...formData, condition: e.target.value })
                      }
                    >
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                      Status
                    </label>
                    <select
                      className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="Available">Available</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Sold">Sold</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Campus Location
                  </label>
                  <input
                    required
                    placeholder="Example: Hunter West Lobby"
                    className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                    value={formData.campus_location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        campus_location: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Map Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        placeholder="Enter address..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                        value={tempAddress}
                        onChange={(e) => setTempAddress(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddressLookup(tempAddress)}
                      className="px-4 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs hover:bg-black"
                    >
                      Find
                    </button>
                  </div>

                  {formData.location_name && (
                    <p className="text-[10px] text-green-600 font-bold px-1 italic">
                      Found: {formData.location_name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Image Upload
                  </label>

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-100">
                    <Upload size={16} />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFile(e.target.files?.[0])}
                    />
                  </label>

                  {formData.imageInput && (
                    <img
                      src={formData.imageInput}
                      alt="Listing preview"
                      className="mt-2 h-32 w-full rounded-xl object-cover"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details..."
                    className="marketplace-form-input w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl text-white font-bold shadow-xl hover:opacity-90 active:scale-[0.98] mt-4"
                  style={{
                    background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                  }}
                >
                  {editingItem ? "Save Changes" : "Publish Listing"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="marketplace-detail-modal bg-white rounded-[32px] max-w-5xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl flex flex-col md:flex-row border border-white/20"
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white z-10 w-10 h-10 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            >
              <X size={20} className="text-gray-900" />
            </button>

            <div className="w-full md:w-[55%] bg-gray-50 min-h-[300px] flex items-center justify-center">
              <img
                src={
                  selectedItem.images?.[0] ||
                  "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"
                }
                className="w-full h-full object-cover"
                alt={selectedItem.title}
              />
            </div>

            <div className="w-full md:w-[45%] p-10 md:p-12 flex flex-col bg-white">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedItem.courses?.code || "No Course"}
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedItem.condition}
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedItem.status}
                </span>
                <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold uppercase tracking-wider">
  {selectedItem.campus_location?.split(" ")[0] || "CUNY"}
</span>
              </div>

              <h2 className="text-3xl font-black text-gray-900 mb-4">
                {selectedItem.title}
              </h2>

              <p className="text-4xl font-medium mb-8 text-gray-900">
                {formatPrice(selectedItem)}
              </p>

              <div className="space-y-6 mb-10 flex-grow">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Department / Course
                  </h3>
                  <p className="text-gray-600">
                    {selectedItem.departments?.name || "Department not provided"}{" "}
                    {selectedItem.courses?.code ? `• ${selectedItem.courses.code}` : ""}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600">
                    {selectedItem.description || "No description provided."}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Campus Location
                  </h3>
                  <p className="text-gray-600">
                    {selectedItem.campus_location || "Campus location not provided"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Map Location
                  </h3>
                  <div className="flex items-center gap-1 text-gray-500 mb-2">
                    <MapPin size={14} className="text-blue-500" />
                    <span className="text-sm font-medium">
                      {selectedItem.location_name || "Map location not provided"}
                    </span>
                  </div>
                  {selectedItem.latitude && (
                    <div
                      id="item-map"
                      className="w-full h-48 rounded-2xl border border-gray-100 shadow-inner bg-gray-50"
                    />
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
  {selectedItem.seller_avatar_url ? (
    <img
      src={selectedItem.seller_avatar_url}
      alt="Seller"
      className="w-full h-full object-cover"
    />
  ) : (
    selectedItem.seller_name?.[0]?.toUpperCase() || "U"
  )}
</div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                      Listed By
                    </p>
                    <p className="text-sm font-bold">
                      {selectedItem.seller_name || "Anonymous"}
                    </p>
                  </div>
                </div>
              </div>

              {currentUserId === selectedItem.user_id ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => openEditModal(selectedItem)}
                    className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-200 text-lg font-bold rounded-2xl hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <Pencil size={20} /> Edit Listing
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    {(["Available", "Reserved", "Sold"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedItem.id, status)}
                        className={`rounded-xl border px-2 py-3 text-xs font-bold ${
                          selectedItem.status === status
                            ? "border-blue-400 bg-blue-50 text-blue-600"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDeleteListing(selectedItem.id)}
                    className="w-full py-4 bg-red-50 text-red-600 border border-red-200 text-lg font-bold rounded-2xl hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={20} /> Delete Listing
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOpenMessage}
                    disabled={actionLoading || selectedItem.status !== "Available"}
                    className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <MessageCircle size={20} /> Message Seller
                  </button>
                  <button
  onClick={() => setIsBuyModalOpen(true)}
  disabled={buyLoading || selectedItem.status !== "Available"}
  className="w-full py-5 bg-green-600 text-white text-lg font-bold rounded-2xl hover:bg-green-700 shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
>
  <ShoppingBag size={20} /> Buy Now
</button>
<button
  onClick={handleToggleSave}
  className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all"
>
  <Heart
    size={20}
    fill={
      selectedItem &&
      savedListingIds.includes(selectedItem.id)
        ? "currentColor"
        : "none"
    }
  />
  {selectedItem &&
  savedListingIds.includes(selectedItem.id)
    ? "Saved"
    : "Save Item"}
</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setActionMessage(null);
                        setIsReportModalOpen(true);
                      }}
                      className="w-full py-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-all inline-flex items-center justify-center gap-2"
                    >
                      <ShieldAlert size={16} /> Report
                    </button>

                    <button
                      onClick={() => {
                        setBlockMessage(null);
                        setIsBlockModalOpen(true);
                      }}
                      disabled={actionLoading}
                      className="w-full py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <UserX size={16} /> Block Seller
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isBuyModalOpen && selectedItem && (
  <div className="fixed inset-0 z-[94] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
    <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/20 bg-[#0b1733] shadow-2xl overflow-hidden">
      <div
        className="h-1.5 w-full"
        style={{
          background:
            "linear-gradient(90deg,#00AAFF,#6B30FF)",
        }}
      />

      <div className="p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black text-white">
            Confirm Purchase Request
          </h2>

          <button
            onClick={() =>
              setIsBuyModalOpen(false)
            }
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <X className="text-slate-300" />
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-500/20 bg-[#13284d] p-5 mb-5">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Item
            </p>

            <p className="text-xl font-black text-white">
              {selectedItem.title}
            </p>
          </div>

          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Price
            </p>

            <p className="text-3xl font-black text-green-400">
              {formatPrice(selectedItem)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Meetup Location
            </p>

            <p className="text-base font-semibold text-slate-200">
              {selectedItem.campus_location ||
                "Campus meetup location not provided"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-[#13284d] p-4 mb-6">
         <p className="text-sm text-slate-300 leading-relaxed">
  Choose{" "}
  <span className="font-bold text-white">
    Buy at Full Price
  </span>{" "}
  if you are ready to purchase this item for the listed price.
  <br />
  Choose{" "}
  <span className="font-bold text-white">
    Negotiate
  </span>{" "}
  if you want to message the seller first.
</p>
        </div>

<div className="grid grid-cols-1 gap-3">
  <button
    type="button"
    onClick={handleBuyNow}
    disabled={buyLoading}
    className="w-full py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 disabled:opacity-70"
    style={{
      background:
        "linear-gradient(90deg,#00AAFF,#6B30FF)",
    }}
  >
    {buyLoading
      ? "Sending..."
      : `Buy for ${formatPrice(selectedItem)}`}
  </button>

  <button
    type="button"
    onClick={() => {
      setIsBuyModalOpen(false);
      handleOpenMessage();
    }}
    disabled={actionLoading}
    className="w-full py-3 rounded-2xl border border-cyan-500/30 bg-[#13284d] text-slate-200 font-bold hover:bg-[#17325f] transition"
  >
    Negotiate Price / Message Seller
  </button>

  <button
    type="button"
    onClick={() =>
      setIsBuyModalOpen(false)
    }
    className="w-full py-3 rounded-2xl border border-slate-600 bg-transparent text-slate-300 font-bold hover:bg-white/10 transition"
  >
    Cancel
  </button>
</div>
      </div>
    </div>
  </div>
)}

      {isReportModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="report-modal-shell w-full max-w-2xl rounded-[2rem] border border-cyan-500/20 bg-[#0b1733]/95 p-7 shadow-2xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black text-slate-100">
                Report Listing
              </h2>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-5 text-base text-slate-300">
              Choose a reason to report this listing.
            </p>

            <div className="space-y-3 mb-5">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => {
                    setReportReason(reason.id);
                    setReportMessage(null);
                  }}
                  className={`report-reason-button w-full rounded-xl border px-5 py-4 text-left text-lg font-semibold transition ${
                    reportReason === reason.id
                      ? "report-reason-selected border-cyan-300/60 bg-blue-600 text-white shadow-sm"
                      : "border-cyan-500/30 bg-[#13284d] text-slate-100 hover:bg-[#17325f]"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {reportReason === "other" && (
              <div className="mb-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-300">
                  Details
                </label>
                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => {
                    setReportDetails(e.target.value);
                    setReportMessage(null);
                  }}
                  className="w-full resize-none rounded-2xl border border-cyan-500/25 bg-[#0c1b37] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400"
                  placeholder="Tell us what happened..."
                  maxLength={500}
                />
              </div>
            )}

            {reportMessage && (
              <div className="mb-5 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                {reportMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="report-cancel-button w-full rounded-xl border border-cyan-500/30 bg-[#13284d] py-4 text-lg font-bold text-slate-100 transition hover:bg-[#17325f]"
              >
                Cancel
              </button>
              <button
                onClick={handleReportListing}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                }}
              >
                {actionLoading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBlockModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="report-modal-shell bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-2xl font-black text-gray-900">
                  Block Seller
                </h2>
                <button
                  onClick={() => setIsBlockModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-700">
                Block{" "}
                <span className="font-semibold">
                  {selectedItem.seller_name || "this seller"}
                </span>
                ? You will not be able to message each other, and their listings
                will be hidden for you.
              </p>

              {blockMessage && (
                <div className="report-status-message rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 p-3 mt-4">
                  {blockMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="report-cancel-button w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBlockSeller}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                  }}
                >
                  {actionLoading ? "Blocking..." : "Block Seller"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
