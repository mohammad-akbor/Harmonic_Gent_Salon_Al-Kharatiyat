"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Service = { _id: string; name: string; category: string; price: number; durationMin: number; status: string };
type Staff = {
  _id: string;
  name: string;
  department: string;
  phone?: string;
  status: string;
  servicePercent?: number;
  productPercent?: number;
  salaryType?: string;
  fixedSalary?: number;
};
type User = { _id: string; name: string; email: string; role: string; phone?: string };
type Product = { _id: string; name: string; sellPrice: number; costPrice: number; stock: number; category: string; status: string };
type Branch = { _id: string; name: string; city?: string; status: string; phone?: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"services" | "staff" | "products" | "branches" | "users" | "media">("services");
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [svcForm, setSvcForm] = useState({ name: "", category: "Barber", price: "", durationMin: "30" });
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    department: "Barber",
    phone: "",
    email: "",
    password: "",
    status: "Active",
    servicePercent: "40",
    productPercent: "5",
    salaryType: "Commission",
    fixedSalary: "0",
  });
  const [prodForm, setProdForm] = useState({ name: "", sellPrice: "", costPrice: "", stock: "0", category: "Hair Care" });
  const [branchForm, setBranchForm] = useState({ name: "", city: "Doha", phone: "" });
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [mediaForm, setMediaForm] = useState({
    type: "background_video",
    title: "",
    url: "",
    thumbnailUrl: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      toast.error("Admin only");
      router.push("/");
    }
  }, [status, session, router]);

  async function loadAll() {
    const [s, st, u, p, b, m] = await Promise.all([
      fetch("/api/services?all=1").then((r) => r.json()),
      fetch("/api/staff?all=1").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/products?all=1").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/media?all=1").then((r) => r.json()),
    ]);
    if (s.ok) setServices(s.services);
    if (st.ok) setStaff(st.staff);
    if (u.ok) setUsers(u.users);
    if (p.ok) setProducts(p.products);
    if (b.ok) setBranches(b.branches);
    if (m.ok) setMediaList(m.media || []);
  }

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "admin") loadAll();
  }, [status, session]);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: svcForm.name,
        category: svcForm.category,
        price: Number(svcForm.price),
        durationMin: Number(svcForm.durationMin),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Service created");
      setSvcForm({ name: "", category: "Barber", price: "", durationMin: "30" });
      loadAll();
    } else toast.error(data.error);
  }

  async function toggleService(id: string, st: string) {
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: st === "Active" ? "Inactive" : "Active" }),
    });
    if ((await res.json()).ok) {
      toast.success("Updated");
      loadAll();
    }
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: staffForm.name,
      department: staffForm.department,
      phone: staffForm.phone,
      email: staffForm.email,
      password: staffForm.password,
      status: staffForm.status,
      servicePercent: Number(staffForm.servicePercent) / 100,
      productPercent: Number(staffForm.productPercent) / 100,
      salaryType: staffForm.salaryType,
      fixedSalary: Number(staffForm.fixedSalary),
    };
    const res = await fetch(editStaffId ? `/api/staff/${editStaffId}` : "/api/staff", {
      method: editStaffId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(
        editStaffId
          ? "Staff updated"
          : data.login?.email
          ? `Staff created · login: ${data.login.email}`
          : "Staff created (add email+password for login)"
      );
      setEditStaffId(null);
      setStaffForm({
        name: "",
        department: "Barber",
        phone: "",
        email: "",
        password: "",
        status: "Active",
        servicePercent: "40",
        productPercent: "5",
        salaryType: "Commission",
        fixedSalary: "0",
      });
      loadAll();
    } else toast.error(data.error);
  }

  function startEditStaff(s: Staff) {
    setEditStaffId(s._id);
    setStaffForm({
      name: s.name,
      department: s.department || "Barber",
      phone: s.phone || "",
      email: (s as any).email || "",
      password: "",
      status: s.status || "Active",
      servicePercent: String(Math.round((s.servicePercent ?? 0.4) * 100)),
      productPercent: String(Math.round((s.productPercent ?? 0.05) * 100)),
      salaryType: s.salaryType || "Commission",
      fixedSalary: String((s as any).fixedSalary || 0),
    });
    setTab("staff");
  }

  async function deleteStaff(id: string) {
    if (!confirm("Deactivate / remove this staff from booking?")) return;
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      toast.success("Staff deactivated");
      loadAll();
    } else toast.error(data.error);
  }

  async function updateStaffPct(id: string, field: "servicePercent" | "productPercent", valuePct: number) {
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: valuePct / 100 }),
    });
    if ((await res.json()).ok) {
      toast.success("Commission updated");
      loadAll();
    }
  }

  async function toggleStaff(id: string, current: string) {
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "Active" ? "Inactive" : "Active" }),
    });
    if ((await res.json()).ok) {
      toast.success(current === "Active" ? "Deactivated" : "Activated");
      loadAll();
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: prodForm.name,
        sellPrice: Number(prodForm.sellPrice),
        costPrice: Number(prodForm.costPrice),
        stock: Number(prodForm.stock),
        category: prodForm.category,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Product created");
      setProdForm({ name: "", sellPrice: "", costPrice: "", stock: "0", category: "Hair Care" });
      loadAll();
    } else toast.error(data.error);
  }

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branchForm),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Branch created");
      setBranchForm({ name: "", city: "Doha", phone: "" });
      loadAll();
    } else toast.error(data.error);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if ((await res.json()).ok) {
      toast.success("User deleted");
      loadAll();
    }
  }

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <Link href="/" className="text-[#d4af37] font-bold">← Home</Link>
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <Link href="/finance" className="px-4 py-2 rounded-xl btn-glow text-sm">
            Finance / P&amp;L →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["services", "staff", "products", "branches", "users", "media"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl capitalize font-medium transition ${
                tab === t ? "bg-[#d4af37] text-[#0b1220]" : "glass hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* SERVICES */}
        {tab === "services" && (
          <div className="space-y-6">
            <form onSubmit={createService} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input required value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category</label>
                <input value={svcForm.category} onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Price QAR</label>
                <input required type="number" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Duration min</label>
                <input type="number" value={svcForm.durationMin} onChange={(e) => setSvcForm({ ...svcForm, durationMin: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              </div>
              <button type="submit" className="btn-glow py-2 rounded-lg">+ Add Service</button>
            </form>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s._id} className="glass rounded-xl p-4 flex justify-between items-center gap-3">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-slate-400 text-sm ml-2">{s.category} · {s.durationMin}min · {s.price} QAR</span>
                  </div>
                  <button onClick={() => toggleService(s._id, s.status)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${s.status === "Active" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600 text-slate-300"}`}>
                    {s.status}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAFF + COMMISSION % */}
        {tab === "staff" && (
          <div className="space-y-6">
            <form onSubmit={createStaff} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input required placeholder="Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <div>
                <label className="text-xs text-slate-400">Department (Barber / Mani / Pedi)</label>
                <select value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                  <option value="Barber">Barber</option>
                  <option value="Manicure">Manicure</option>
                  <option value="Pedicure">Pedicure</option>
                  <option value="Massage">Massage</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <input placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input type="email" placeholder="Login email (for staff login)" value={staffForm.email || ""} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input type="password" placeholder="Login password (min 6)" value={staffForm.password || ""} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <div>
                <label className="text-xs text-slate-400">Pay type</label>
                <select value={staffForm.salaryType} onChange={(e) => setStaffForm({ ...staffForm, salaryType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                  <option value="Commission">Commission (% on services)</option>
                  <option value="Fixed">Fixed salary (no booking list)</option>
                </select>
              </div>
              {staffForm.salaryType === "Fixed" ? (
                <div>
                  <label className="text-xs text-slate-400">Fixed salary QAR / month</label>
                  <input type="number" value={staffForm.fixedSalary} onChange={(e) => setStaffForm({ ...staffForm, fixedSalary: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-400">Service commission % (30–45)</label>
                  <select value={staffForm.servicePercent} onChange={(e) => setStaffForm({ ...staffForm, servicePercent: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                    {[30, 35, 40, 45, 50].map((p) => (
                      <option key={p} value={String(p)}>{p}%</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400">Product commission %</label>
                <select value={staffForm.productPercent} onChange={(e) => setStaffForm({ ...staffForm, productPercent: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                  {[0, 3, 5, 7, 10].map((p) => (
                    <option key={p} value={String(p)}>{p}%</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-end">
                <button type="submit" className="btn-glow py-2 px-4 rounded-lg flex-1">
                  {editStaffId ? "Save Update" : "+ Add Staff"}
                </button>
                {editStaffId && (
                  <button type="button" onClick={() => { setEditStaffId(null); setStaffForm({ name: "", department: "Barber", phone: "", status: "Active", servicePercent: "40", productPercent: "5", salaryType: "Commission", fixedSalary: "0" }); }} className="px-3 py-2 rounded-lg bg-white/10 text-sm">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <p className="text-xs text-slate-400">Example: Service 100 QAR × 40% = 40 QAR staff · Product 100 QAR × 5% = 5 QAR staff</p>
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s._id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-400 text-sm ml-2">{s.department}</span>
                    </div>
                    <button onClick={() => toggleStaff(s._id, s.status)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${s.status === "Active" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {s.status}
                    </button>
                    <button type="button" onClick={() => startEditStaff(s)} className="px-3 py-1 rounded-lg text-xs bg-white/10">Edit</button>
                    <button type="button" onClick={() => deleteStaff(s._id)} className="px-3 py-1 rounded-lg text-xs text-red-400 bg-red-500/10">Delete</button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm items-center">
                    <label className="flex items-center gap-2">
                      Service %
                      <select
                        value={Math.round((s.servicePercent ?? 0.4) * 100)}
                        onChange={(e) => updateStaffPct(s._id, "servicePercent", Number(e.target.value))}
                        className="px-2 py-1 rounded bg-slate-900 border border-white/10"
                      >
                        {[25, 30, 35, 40, 45, 50].map((p) => (
                          <option key={p} value={p}>{p}%</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      Product %
                      <select
                        value={Math.round((s.productPercent ?? 0.05) * 100)}
                        onChange={(e) => updateStaffPct(s._id, "productPercent", Number(e.target.value))}
                        className="px-2 py-1 rounded bg-slate-900 border border-white/10"
                      >
                        {[0, 3, 5, 7, 10].map((p) => (
                          <option key={p} value={p}>{p}%</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div className="space-y-6">
            <form onSubmit={createProduct} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <input required placeholder="Name" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input required type="number" placeholder="Sell price" value={prodForm.sellPrice} onChange={(e) => setProdForm({ ...prodForm, sellPrice: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input type="number" placeholder="Cost price" value={prodForm.costPrice} onChange={(e) => setProdForm({ ...prodForm, costPrice: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input type="number" placeholder="Stock" value={prodForm.stock} onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <button type="submit" className="btn-glow py-2 rounded-lg">+ Product</button>
            </form>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p._id} className="glass rounded-xl p-4 flex justify-between gap-3">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-slate-400 text-sm ml-2">Sell {p.sellPrice} · Cost {p.costPrice} · Stock {p.stock}</span>
                  </div>
                  <span className="text-xs text-slate-400">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRANCHES */}
        {tab === "branches" && (
          <div className="space-y-6">
            <form onSubmit={createBranch} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <input required placeholder="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input placeholder="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <input placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
              <button type="submit" className="btn-glow py-2 rounded-lg">+ Branch</button>
            </form>
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b._id} className="glass rounded-xl p-4 flex justify-between">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-slate-400 text-sm">{b.city} · {b.status}</span>
                </div>
              ))}
              {branches.length === 0 && <p className="text-slate-500 text-sm">No branches yet. Create multiple for multi-location tracking.</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u._id} className="glass rounded-xl p-4 flex justify-between items-center gap-3">
                <div>
                  <span className="font-medium">{u.name}</span>
                  <span className="text-slate-400 text-sm ml-2">{u.email} · {u.role}</span>
                </div>
                <button onClick={() => deleteUser(u._id)} className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* MEDIA — background video + gallery (Admin only upload) */}
        {tab === "media" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-[#d4af37]">Upload Media</h2>
              <p className="text-xs text-slate-400">
                Direct file upload (image/video) OR paste URL. Cloudinary if configured, else local /uploads.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const res = await fetch("/api/media/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.ok) {
                    toast.success(data.message || "Uploaded");
                    (e.target as HTMLFormElement).reset();
                    loadAll();
                  } else toast.error(data.error);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/10"
              >
                <select name="type" className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                  <option value="background_video">Background Video</option>
                  <option value="gallery_image">Gallery Image</option>
                  <option value="story">Story</option>
                  <option value="hero_image">Hero Image</option>
                  <option value="promo_video">Promo Video</option>
                </select>
                <input name="title" placeholder="Title (optional)" className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10" />
                <input name="file" type="file" accept="image/*,video/*" required className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 sm:col-span-2 text-sm" />
                <button type="submit" className="btn-glow py-2 rounded-lg sm:col-span-2">Direct Upload File</button>
              </form>
              <p className="text-xs text-slate-500 mb-2">Or paste URL:</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch("/api/media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mediaForm),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    toast.success("Media saved — live on home page");
                    setMediaForm({ type: "background_video", title: "", url: "", thumbnailUrl: "" });
                    loadAll();
                  } else toast.error(data.error);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <select
                  value={mediaForm.type}
                  onChange={(e) => setMediaForm({ ...mediaForm, type: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
                >
                  <option value="background_video">Background Video (full site)</option>
                  <option value="gallery_image">Gallery Image</option>
                  <option value="story">Story / Shot (home)</option>
                  <option value="hero_image">Hero Image</option>
                  <option value="promo_video">Promo Video</option>
                </select>
                <input
                  placeholder="Title (optional)"
                  value={mediaForm.title}
                  onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10"
                />
                <input
                  required
                  placeholder="Video/Image URL (https://...mp4 or image)"
                  value={mediaForm.url}
                  onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 sm:col-span-2"
                />
                <button type="submit" className="btn-glow py-2 rounded-lg sm:col-span-2">
                  Save &amp; Publish
                </button>
              </form>
            </div>
            <div className="space-y-2">
              {mediaList.map((m) => (
                <div key={m._id} className="glass rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-[#d4af37] uppercase">{m.type}</span>
                    <div className="font-medium truncate">{m.title || m.url}</div>
                    <div className="text-xs text-slate-500 truncate">{m.url}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded ${m.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600"}`}>
                      {m.isActive ? "Active" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/media/${m._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !m.isActive }),
                        });
                        loadAll();
                      }}
                      className="text-xs px-2 py-1 rounded bg-white/10"
                    >
                      Toggle
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete?")) return;
                        await fetch(`/api/media/${m._id}`, { method: "DELETE" });
                        loadAll();
                      }}
                      className="text-xs text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {mediaList.length === 0 && (
                <p className="text-slate-500 text-sm">No media yet. Add a background video URL to upgrade the home page.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
