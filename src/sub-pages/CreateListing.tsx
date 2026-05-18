import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Upload, X } from "lucide-react";
import { supabase } from "../../supabase-client";

type ItemCategory = { id: number; name: string };
type Department = { id: number; name: string; code: string };
type Course = { id: number; department_id: number; code: string; name: string };

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

export default function CreateListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [formData, setFormData] = useState(emptyForm);
  const [tempAddress, setTempAddress] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [departmentInput, setDepartmentInput] = useState("");
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);

  // ── fetch deps ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => {
      setDepartments((data ?? []) as Department[]);
    });
    supabase.from("courses").select("*").order("code").then(({ data }) => {
      setCourses((data ?? []) as Course[]);
    });
    supabase.from("item_categories").select("*").order("name").then(({ data }) => {
      setItemCategories((data ?? []) as ItemCategory[]);
    });
  }, []);

  // ── load existing listing when editing ────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    supabase
      .from("marketplace_listings")
      .select("*, courses(*), item_categories(*), departments(*)")
      .eq("id", editId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          alert("Could not load listing for editing.");
          navigate("/marketplace");
          return;
        }
        setFormData({
          item_category_id: data.item_category_id ? String(data.item_category_id) : "",
          categoryInput: (data as any).item_categories?.name ?? "",
          title: data.title ?? "",
          price: data.price ? String(data.price) : "",
          is_free: data.is_free ?? false,
          description: data.description ?? "",
          condition: data.condition ?? "Good",
          campus_location: data.campus_location ?? "",
          imageInput: data.images?.[0] ?? "",
          department_id: data.department_id ? String(data.department_id) : "",
          course_id: data.course_id ? String(data.course_id) : "",
          courseInput: (data as any).courses?.code ?? "",
          status: data.status ?? "Available",
          location_name: data.location_name ?? "",
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setTempAddress(data.location_name ?? "");
        setDepartmentInput((data as any).departments?.name ?? "");
        setLoadingEdit(false);
      });
  }, [editId, navigate]);

  // ── map init ──────────────────────────────────────────────────────────────
  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === formData.department_id),
    [departments, formData.department_id]
  );

  const filteredDepartments = useMemo(() => {
    if (!departmentInput.trim()) return [];
    return departments.filter((d) =>
      d.name.toLowerCase().includes(departmentInput.toLowerCase())
    );
  }, [departmentInput, departments]);

  const filteredCourses = useMemo(() => {
    if (!formData.department_id || !formData.courseInput.trim()) return [];
    return courses.filter(
      (c) =>
        String(c.department_id) === formData.department_id &&
        c.code.toLowerCase().includes(formData.courseInput.toLowerCase())
    );
  }, [courses, formData.department_id, formData.courseInput]);

  const filteredCategories = useMemo(() => {
    if (!formData.categoryInput.trim()) return [];
    return itemCategories
      .filter((c) => c.name.toLowerCase().includes(formData.categoryInput.toLowerCase()))
      .slice(0, 4);
  }, [formData.categoryInput, itemCategories]);

  const handleImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageInput: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddressLookup = useCallback(async (address: string) => {
    if (address.length < 5) return;
    const API_KEY = import.meta.env.VITE_GEOCODIO_KEY;
    try {
      const res = await fetch(
        `https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(address)}&api_key=${API_KEY}`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const result = data.results[0];
        setFormData((prev) => ({
          ...prev,
          location_name: result.formatted_address,
          latitude: result.location.lat,
          longitude: result.location.lng,
        }));
      } else {
        alert("Address not found. Try a more specific address.");
      }
    } catch {
      alert("Address lookup failed. Check your network.");
    }
  }, []);

  const handleCreateCategory = useCallback(async () => {
    const clean = formData.categoryInput.trim();
    if (!clean) return;
    const { data, error } = await supabase
      .from("item_categories")
      .insert({ name: clean })
      .select()
      .single();
    if (error) { alert("Could not create category: " + error.message); return; }
    setItemCategories((prev) => [...prev, data as ItemCategory]);
    setFormData((prev) => ({
      ...prev,
      item_category_id: String((data as ItemCategory).id),
      categoryInput: (data as ItemCategory).name,
    }));
    setShowCategoryDropdown(false);
  }, [formData.categoryInput]);

  const handleCreateCourse = useCallback(async () => {
    if (!formData.department_id || !formData.courseInput.trim()) return;
    const code = (
      (selectedDepartment?.code || "") +
      " " +
      formData.courseInput.replace(selectedDepartment?.code || "", "").trim()
    )
      .trim()
      .toUpperCase();

    const { data, error } = await supabase
      .from("courses")
      .insert({ department_id: Number(formData.department_id), code, name: code })
      .select()
      .single();
    if (error) { alert("Could not create course: " + error.message); return; }
    setCourses((prev) => [...prev, data as Course]);
    setFormData((prev) => ({
      ...prev,
      course_id: String((data as Course).id),
      courseInput: (data as Course).code,
    }));
    setShowCourseDropdown(false);
  }, [formData.department_id, formData.courseInput, selectedDepartment]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("You must be logged in."); return; }

      if (!formData.department_id) { alert("Please select a department."); return; }
      if (!formData.course_id) { alert("Please select or create a course."); return; }

      setSubmitting(true);

      const price = formData.is_free
        ? 0
        : parseInt(formData.price.replace(/[^0-9]/g, "")) || 0;

      const sellerName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "Unknown Seller";

      const payload = {
        item_category_id: formData.item_category_id ? Number(formData.item_category_id) : null,
        user_id: user.id,
        seller_name: sellerName,
        seller_avatar_url: user.user_metadata?.avatar_url || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        is_free: formData.is_free,
        condition: formData.condition,
        department_id: Number(formData.department_id),
        course_id: Number(formData.course_id),
        campus_location: formData.campus_location.trim(),
        images: formData.imageInput ? [formData.imageInput] : [],
        status: formData.status,
        sold: formData.status === "Sold",
        location_name: formData.location_name || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      let error;
      if (isEditing && editId) {
        ({ error } = await supabase.from("marketplace_listings").update(payload).eq("id", editId));
      } else {
        ({ error } = await supabase.from("marketplace_listings").insert([payload]));
      }

      setSubmitting(false);

      if (error) {
        alert("Error saving listing: " + error.message);
      } else {
        navigate(isEditing && editId ? `/marketplace/${editId}` : "/my-listings");
      }
    },
    [formData, isEditing, editId, navigate]
  );

  const formPriceLabel = formData.is_free ? "Price (Free)" : "Price ($)";

  if (loadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0f1a" }}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0b0f1a", paddingTop: 80 }}>
      <div className="max-w-lg mx-auto px-4 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-slate-300 hover:text-white transition"
            style={{ background: "#0b1733", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-black text-white">
            {isEditing ? "Edit Listing" : "List an Item"}
          </h1>
        </div>

        {/* Form card */}
        <div
          className="rounded-[2rem] overflow-hidden shadow-2xl"
          style={{ background: "#ffffff" }}
        >
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }} />

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Category */}
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Category</label>
              <input
                required
                type="text"
                placeholder="Search or create category..."
                value={formData.categoryInput}
                onFocus={() => { if (formData.categoryInput.trim()) setShowCategoryDropdown(true); }}
                onChange={(e) => {
                  setFormData({ ...formData, categoryInput: e.target.value, item_category_id: "" });
                  setShowCategoryDropdown(e.target.value.trim().length > 0);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
              />
              {showCategoryDropdown && formData.categoryInput.trim() && (
                <div className="absolute top-full z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm text-gray-200 bg-[#071326] hover:bg-[#13284d]"
                      onClick={() => {
                        setFormData({ ...formData, item_category_id: String(cat.id), categoryInput: cat.name });
                        setShowCategoryDropdown(false);
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {!itemCategories.some(
                    (c) => c.name.toLowerCase() === formData.categoryInput.trim().toLowerCase()
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

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Title</label>
              <input
                required
                placeholder="What are you selling?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">{formPriceLabel}</label>
                <input
                  required={!formData.is_free}
                  disabled={formData.is_free}
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none disabled:opacity-50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9]/g, "") })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Price Type</label>
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

            {/* Department */}
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Department</label>
              <input
                type="text"
                placeholder="Search department..."
                value={departmentInput}
                onFocus={() => setShowDepartmentDropdown(true)}
                onChange={(e) => {
                  setDepartmentInput(e.target.value);
                  setFormData({ ...formData, department_id: "", course_id: "", courseInput: "" });
                  setShowDepartmentDropdown(true);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
              />
              {showDepartmentDropdown && (
                <div className="absolute top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
                  {filteredDepartments.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-300">No departments found</div>
                  )}
                  {filteredDepartments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      className={`block w-full px-4 py-3 text-left text-sm transition ${
                        departmentInput === dept.name
                          ? "bg-blue-600 text-white"
                          : "bg-[#071326] text-gray-200 hover:bg-[#13284d]"
                      }`}
                      onClick={() => {
                        setDepartmentInput(dept.name);
                        setFormData({ ...formData, department_id: String(dept.id), course_id: "", courseInput: "" });
                        setShowDepartmentDropdown(false);
                      }}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Course */}
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Course</label>
              <input
                required
                disabled={!formData.department_id}
                placeholder={selectedDepartment ? `Search ${selectedDepartment.code} course...` : "Select department first"}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none disabled:opacity-50"
                value={formData.courseInput}
                onFocus={() => { if (formData.courseInput.trim()) setShowCourseDropdown(true); }}
                onChange={(e) => {
                  setFormData({ ...formData, courseInput: e.target.value, course_id: "" });
                  setShowCourseDropdown(e.target.value.trim().length > 0);
                }}
              />
              {showCourseDropdown && formData.department_id && formData.courseInput.trim() && (
                <div className="absolute top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-cyan-500/20 bg-[#0b1733] shadow-2xl">
                  {filteredCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm text-gray-200 bg-[#071326] hover:bg-[#13284d]"
                      onClick={() => {
                        setFormData({ ...formData, course_id: String(course.id), courseInput: course.code });
                        setShowCourseDropdown(false);
                      }}
                    >
                      {course.code}
                    </button>
                  ))}
                  {!filteredCourses.some(
                    (c) => c.code.toLowerCase() === formData.courseInput.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-cyan-300 bg-[#071326] hover:bg-[#13284d]"
                      onClick={handleCreateCourse}
                    >
                      + Create {selectedDepartment?.code}{" "}
                      {formData.courseInput.replace(selectedDepartment?.code || "", "").trim().toUpperCase()}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Condition / Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Condition</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Status</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
            </div>

            {/* Campus Location */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Campus Location</label>
              <input
                required
                placeholder="Example: Hunter West Lobby"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                value={formData.campus_location}
                onChange={(e) => setFormData({ ...formData, campus_location: e.target.value })}
              />
            </div>

            {/* Map Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Map Address</label>
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

            {/* Image Upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Image Upload</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-100">
                <Upload size={16} />
                {formData.imageInput ? "Change Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                />
              </label>
              {formData.imageInput && (
                <div className="relative mt-2">
                  <img
                    src={formData.imageInput}
                    alt="Preview"
                    className="h-32 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, imageInput: "" }))}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Description</label>
              <textarea
                rows={4}
                placeholder="Provide details about your item..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-bold shadow-xl hover:opacity-90 active:scale-[0.98] mt-2 disabled:opacity-70"
              style={{ background: "linear-gradient(90deg,#00AAFF,#6B30FF)" }}
            >
              {submitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Publish Listing"}
            </button>

            <p className="text-center text-xs text-gray-400 pb-2">
              By listing, you agree to CUNY ReMarket's{" "}
              <Link to="/privacy-policy" className="underline">Terms & Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
