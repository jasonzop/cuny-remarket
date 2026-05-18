import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Upload, X } from "lucide-react";
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

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const briq: React.CSSProperties = { fontFamily: "'Bricolage Grotesque', sans-serif" };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>
      {children}
    </p>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.26)", borderRadius: 0, backgroundColor: "#fffdf7", padding: "10px 12px", ...briq, fontSize: 14, fontWeight: 500, color: "#1a1216", outline: "none", boxSizing: "border-box", ...props.style }}
    />
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [formData, setFormData] = useState(emptyForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [departmentInput, setDepartmentInput] = useState("");
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tempAddress, setTempAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === formData.department_id),
    [departments, formData.department_id]
  );

  const filteredCourses = useMemo(() => {
    if (!formData.department_id || !formData.courseInput.trim()) return [];
    return courses.filter(
      (c) => String(c.department_id) === formData.department_id && c.code.toLowerCase().includes(formData.courseInput.toLowerCase())
    );
  }, [courses, formData.department_id, formData.courseInput]);

  const filteredDepartments = useMemo(() => {
    if (!departmentInput.trim()) return [];
    return departments.filter((d) => d.name.toLowerCase().includes(departmentInput.toLowerCase()));
  }, [departmentInput, departments]);

  const filteredItemCategories = useMemo(() => {
    if (!formData.categoryInput.trim()) return [];
    return itemCategories.filter((c) => c.name.toLowerCase().includes(formData.categoryInput.toLowerCase())).slice(0, 4);
  }, [formData.categoryInput, itemCategories]);

  const loadData = useCallback(async () => {
    const [{ data: depts }, { data: cours }, { data: cats }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("courses").select("*").order("code"),
      supabase.from("item_categories").select("*").order("name"),
    ]);
    if (depts) setDepartments(depts as Department[]);
    if (cours) setCourses(cours as Course[]);
    if (cats) setItemCategories(cats as ItemCategory[]);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
    });
    loadData();
  }, [navigate, loadData]);

  useEffect(() => {
    if (!editId) return;
    supabase
      .from("marketplace_listings")
      .select("*, departments(*), courses(*), item_categories(*)")
      .eq("id", editId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setEditingId(editId);
        setDepartmentInput(data.departments?.name ?? "");
        setTempAddress(data.location_name ?? "");
        setFormData({
          title: data.title ?? "",
          price: data.price ? String(data.price) : "",
          is_free: data.is_free ?? false,
          description: data.description ?? "",
          item_category_id: data.item_category_id ? String(data.item_category_id) : "",
          categoryInput: data.item_categories?.name ?? "",
          condition: data.condition ?? "Good",
          campus_location: data.campus_location ?? "",
          imageInput: data.images?.[0] ?? "",
          department_id: data.department_id ? String(data.department_id) : "",
          course_id: data.course_id ? String(data.course_id) : "",
          courseInput: data.courses?.code ?? "",
          status: data.status ?? "Available",
          location_name: data.location_name ?? "",
          latitude: data.latitude,
          longitude: data.longitude,
        });
      });
  }, [editId]);

  const handleImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, imageInput: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleCreateCategory = async () => {
    const clean = formData.categoryInput.trim();
    if (!clean) return;
    const { data, error } = await supabase.from("item_categories").insert({ name: clean }).select("*").single();
    if (error && error.code !== "23505") { alert("Could not create category: " + error.message); return; }
    if (data) {
      setItemCategories((prev) => prev.some((c) => c.name.toLowerCase() === data.name.toLowerCase()) ? prev : [...prev, data as ItemCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, item_category_id: String(data.id), categoryInput: data.name }));
    }
    setShowCategoryDropdown(false);
  };

  const handleCreateCourse = async () => {
    if (!selectedDepartment) return;
    const typed = formData.courseInput.trim().toUpperCase();
    if (!typed) return;
    const courseCode = typed.startsWith(selectedDepartment.code) ? typed : `${selectedDepartment.code} ${typed}`;
    const { data, error } = await supabase.from("courses").insert({ department_id: selectedDepartment.id, code: courseCode, name: courseCode }).select("*").single();
    if (error && error.code !== "23505") { alert("Could not create course: " + error.message); return; }
    if (data) {
      setCourses((prev) => prev.some((c) => c.id === data.id) ? prev : [...prev, data as Course].sort((a, b) => a.code.localeCompare(b.code)));
      setFormData((prev) => ({ ...prev, course_id: String(data.id), courseInput: data.code }));
    }
    setShowCourseDropdown(false);
  };

  const handleAddressLookup = async (address: string) => {
    if (address.length < 5) return;
    const API_KEY = import.meta.env.VITE_GEOCODIO_KEY;
    const res = await fetch(`https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(address)}&api_key=${API_KEY}`);
    const data = await res.json();
    if (data.results?.length > 0) {
      const result = data.results[0];
      setFormData((prev) => ({ ...prev, location_name: result.formatted_address, latitude: result.location.lat, longitude: result.location.lng }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_id) { alert("Please select a department."); return; }
    if (!formData.course_id) { alert("Please select or create a course."); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("You must be logged in to post."); return; }

    setSubmitting(true);

    const numericPrice = formData.is_free ? 0 : parseInt(formData.price.replace(/[^0-9]/g, "")) || 0;
    const sellerName = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split("@")[0] || "Unknown Seller";
    const sellerAvatar = user.user_metadata?.avatar_url || null;

    const payload = {
      item_category_id: Number(formData.item_category_id) || null,
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
      location_name: formData.location_name || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    if (editingId) {
      const { error } = await supabase.from("marketplace_listings").update(payload).eq("id", editingId);
      if (error) { alert("Error updating listing: " + error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from("marketplace_listings").insert([payload]);
      if (error) { alert("Error posting: " + error.message); setSubmitting(false); return; }
    }

    setSubmitting(false);
    navigate("/marketplace");
  };

  const formatPreviewPrice = () => {
    if (formData.is_free) return "Free";
    if (!formData.price) return "$0";
    return `$${formData.price}`;
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1eadc", position: "relative" }}>
      {/* Graph paper */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "92px 18px 36px" }}>
        {/* Header */}
        <div style={{ marginBottom: 18, borderBottom: "1px solid rgba(0,0,0,0.22)", paddingBottom: 12 }}>
          <button onClick={() => navigate("/marketplace")} style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            ← Browse
          </button>
          <h1 style={{ ...briq, fontSize: 28, color: "#1a1216", margin: 0, lineHeight: 1, fontWeight: 800 }}>
            {editingId ? "Edit listing" : "List something"}
          </h1>
          <p style={{ ...briq, fontSize: 13, fontStyle: "italic", margin: "4px 0 0", color: "rgba(0,0,0,0.55)" }}>Takes about a minute.</p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start", border: "1px solid rgba(0,0,0,0.24)", backgroundColor: "#fffaf0", padding: 22, boxShadow: "10px 10px 0 rgba(23,18,12,0.08)" }}>

          {/* ── LEFT: FORM ── */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <Label>Photos (up to 5)</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {[0, 1, 2, 3, 4].map((slot) => (
                  <label
                    key={slot}
                    style={{
                      aspectRatio: "1",
                      border: slot < 3 ? "1.5px solid rgba(0,0,0,0.25)" : "1.5px dashed rgba(0,0,0,0.25)",
                      backgroundColor: "#faf6ee",
                      cursor: slot === 0 ? "pointer" : "default",
                      position: "relative",
                      overflow: "hidden",
                      backgroundImage: "repeating-linear-gradient(45deg,rgba(0,0,0,0.03) 0,rgba(0,0,0,0.03) 1px,transparent 1px,transparent 8px)",
                    }}
                  >
                    {slot === 0 && formData.imageInput ? (
                      <img src={formData.imageInput} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 9, color: "rgba(0,0,0,0.35)" }}>
                        {slot === 0 ? "+ upload" : slot < 3 ? "+" : ""}
                      </span>
                    )}
                    {slot === 0 && <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleImageFile(e.target.files?.[0])} />}
                  </label>
                ))}
              </div>
            </div>

            {/* Category */}
            <div style={{ position: "relative" }}>
              <Label>Category</Label>
              <FormInput
                type="text"
                placeholder="Search or create a category..."
                value={formData.categoryInput}
                onFocus={() => { if (formData.categoryInput.trim()) setShowCategoryDropdown(true); }}
                onChange={(e) => {
                  setFormData({ ...formData, categoryInput: e.target.value, item_category_id: "" });
                  setShowCategoryDropdown(e.target.value.trim().length > 0);
                }}
              />
              {showCategoryDropdown && formData.categoryInput.trim() && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40, backgroundColor: "#ffffff", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginTop: 4 }}>
                  {filteredItemCategories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => { setFormData({ ...formData, item_category_id: String(cat.id), categoryInput: cat.name }); setShowCategoryDropdown(false); }}
                      style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", ...briq, fontSize: 13, color: "#1a1216", background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f0e8")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >{cat.name}</button>
                  ))}
                  {!itemCategories.some((c) => c.name.toLowerCase() === formData.categoryInput.trim().toLowerCase()) && (
                    <button type="button" onClick={handleCreateCategory}
                      style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", ...briq, fontSize: 13, fontWeight: 700, color: "#1a1216", background: "#f5f0e8", border: "none", cursor: "pointer" }}
                    >+ Create "{formData.categoryInput.trim()}"</button>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label>Title</Label>
              <FormInput required placeholder="What are you selling?" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>

            {/* Price row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <Label>{formData.is_free ? "Price (Free)" : "Price"}</Label>
                <FormInput type="number" min="0" placeholder="0" disabled={formData.is_free} value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9]/g, "") })} style={{ opacity: formData.is_free ? 0.5 : 1 }} />
              </div>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, is_free: !prev.is_free, price: !prev.is_free ? "" : prev.price }))}
                style={{ padding: "10px 16px", borderRadius: 8, border: `1.5px solid ${formData.is_free ? "#065f46" : "rgba(0,0,0,0.15)"}`, backgroundColor: formData.is_free ? "#d1fae5" : "#ffffff", color: formData.is_free ? "#065f46" : "#1a1216", ...briq, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >{formData.is_free ? "Free" : "Paid"}</button>
            </div>

            {/* Department */}
            <div style={{ position: "relative" }}>
              <Label>Department</Label>
              <FormInput type="text" placeholder="Search department..." value={departmentInput}
                onFocus={() => setShowDepartmentDropdown(true)}
                onChange={(e) => { setDepartmentInput(e.target.value); setFormData({ ...formData, department_id: "", course_id: "", courseInput: "" }); setShowDepartmentDropdown(true); }}
              />
              {showDepartmentDropdown && filteredDepartments.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40, backgroundColor: "#ffffff", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                  {filteredDepartments.map((dept) => (
                    <button key={dept.id} type="button" onClick={() => { setDepartmentInput(dept.name); setFormData({ ...formData, department_id: String(dept.id), course_id: "", courseInput: "" }); setShowDepartmentDropdown(false); }}
                      style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", ...briq, fontSize: 13, color: "#1a1216", background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f0e8")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >{dept.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Course */}
            <div style={{ position: "relative" }}>
              <Label>Course</Label>
              <FormInput required disabled={!formData.department_id} placeholder={selectedDepartment ? `Search ${selectedDepartment.code} course...` : "Select department first"} value={formData.courseInput}
                style={{ opacity: !formData.department_id ? 0.5 : 1 }}
                onFocus={() => { if (formData.courseInput.trim()) setShowCourseDropdown(true); }}
                onChange={(e) => { setFormData({ ...formData, courseInput: e.target.value, course_id: "" }); setShowCourseDropdown(e.target.value.trim().length > 0); }}
              />
              {showCourseDropdown && formData.department_id && formData.courseInput.trim() && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40, backgroundColor: "#ffffff", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                  {filteredCourses.map((course) => (
                    <button key={course.id} type="button" onClick={() => { setFormData({ ...formData, course_id: String(course.id), courseInput: course.code }); setShowCourseDropdown(false); }}
                      style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", ...briq, fontSize: 13, color: "#1a1216", background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f0e8")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >{course.code}</button>
                  ))}
                  {!filteredCourses.some((c) => c.code.toLowerCase() === formData.courseInput.trim().toLowerCase()) && (
                    <button type="button" onClick={handleCreateCourse}
                      style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", ...briq, fontSize: 13, fontWeight: 700, color: "#1a1216", background: "#f5f0e8", border: "none", cursor: "pointer" }}
                    >+ Create {selectedDepartment?.code} {formData.courseInput.replace(selectedDepartment?.code || "", "").trim().toUpperCase()}</button>
                  )}
                </div>
              )}
            </div>

            {/* Condition + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label>Condition</Label>
                <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.26)", borderRadius: 0, backgroundColor: "#fffdf7", padding: "10px 12px", ...briq, fontSize: 14, color: "#1a1216", outline: "none" }}
                >
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.26)", borderRadius: 0, backgroundColor: "#fffdf7", padding: "10px 12px", ...briq, fontSize: 14, color: "#1a1216", outline: "none" }}
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
            </div>

            {/* Campus location */}
            <div>
              <Label>Campus Location</Label>
              <FormInput required placeholder="Example: Hunter West Lobby" value={formData.campus_location} onChange={(e) => setFormData({ ...formData, campus_location: e.target.value })} />
            </div>

            {/* Map address */}
            <div>
              <Label>Map Address (optional)</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <MapPin size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.3)", pointerEvents: "none" }} />
                  <FormInput placeholder="Enter address..." value={tempAddress} onChange={(e) => setTempAddress(e.target.value)} style={{ paddingLeft: 32 }} />
                </div>
                <button type="button" onClick={() => handleAddressLookup(tempAddress)}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1.5px solid #1a1216", backgroundColor: "#1a1216", color: "#ffffff", ...briq, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >Find</button>
              </div>
              {formData.location_name && (
                <p style={{ ...mono, fontSize: 9, color: "#065f46", marginTop: 6 }}>Found: {formData.location_name}</p>
              )}
            </div>

            {/* Image upload */}
            <div style={{ display: "none" }}>
              <Label>Photo</Label>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", border: "1.5px dashed rgba(0,0,0,0.2)", borderRadius: 8, cursor: "pointer", ...briq, fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.4)", backgroundColor: "#faf9f6" }}>
                <Upload size={16} />
                Upload a photo
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleImageFile(e.target.files?.[0])} />
              </label>
              {formData.imageInput && (
                <div style={{ position: "relative", marginTop: 10 }}>
                  <img src={formData.imageInput} alt="Preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }} />
                  <button type="button" onClick={() => setFormData((prev) => ({ ...prev, imageInput: "" }))}
                    style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", backgroundColor: "#1a1216", border: "none", color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  ><X size={14} /></button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <textarea rows={4} placeholder="Describe the item — edition, highlights, any damage..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: "100%", border: "1.5px solid rgba(0,0,0,0.26)", borderRadius: 0, backgroundColor: "#fffdf7", padding: "10px 12px", ...briq, fontSize: 14, color: "#1a1216", outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <button type="button" onClick={() => navigate("/marketplace")}
                style={{ flex: 1, padding: "10px 0", borderRadius: 0, border: "1.5px solid rgba(0,0,0,0.26)", backgroundColor: "transparent", color: "#1a1216", ...briq, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >Cancel</button>
              <button type="submit" disabled={submitting}
                style={{ flex: 2, padding: "10px 0", borderRadius: 0, border: "2px solid #1a1216", backgroundColor: "#1f3d6d", color: "#ffffff", ...briq, fontSize: 14, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >{submitting ? "Posting..." : editingId ? "Save changes" : "Post listing"}</button>
            </div>
          </form>

          {/* ── RIGHT: PREVIEW + TIPS ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 96 }}>

            {/* Live card preview */}
            <div style={{ backgroundColor: "#ffffff", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <p style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", margin: 0 }}>Preview</p>
              </div>
              {/* Book cover */}
              <div style={{ aspectRatio: "4/3", backgroundColor: "#e8e3d9", position: "relative", overflow: "hidden", backgroundImage: "repeating-linear-gradient(-45deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }}>
                {formData.imageInput ? (
                  <img src={formData.imageInput} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 75" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100" y2="75" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                    </svg>
                    <span style={{ position: "absolute", bottom: 6, left: 8, ...mono, fontSize: 8, fontWeight: 700, color: "rgba(0,0,0,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>book cover</span>
                  </>
                )}
              </div>
              <div style={{ padding: "10px 14px 14px" }}>
                <h3 style={{ ...briq, fontSize: 13, fontWeight: 700, fontStyle: "italic", color: "#1a1216", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formData.title || "Your listing title"}</h3>
                <p style={{ ...mono, fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.38)", margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {formData.courseInput || "COURSE"} · {formData.campus_location?.split(" ")[0]?.toUpperCase() || "CAMPUS"}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ ...briq, fontSize: 16, fontWeight: 800, color: "#1a1216" }}>{formatPreviewPrice()}</span>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 999, backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }}>available</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div style={{ backgroundColor: "#faf6ee", border: "1.5px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 12 }}>Listing tips</p>
              {[
                "Add a clear photo — listings with photos sell 3× faster.",
                "Include edition and ISBN for textbooks.",
                "Be honest about condition — builds trust.",
                "Set a fair price: check Amazon for reference.",
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.25)", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <p style={{ ...briq, fontSize: 12, color: "rgba(0,0,0,0.55)", margin: 0 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
