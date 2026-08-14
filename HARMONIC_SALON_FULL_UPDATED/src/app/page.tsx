"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

type Media = { _id: string; type: string; url: string; title?: string; thumbnailUrl?: string };
type Service = { _id: string; name: string; price: number; durationMin: number; category: string };
type Staff = { _id: string; name: string; department: string };
type Product = { _id: string; name: string; sellPrice: number; category: string; stock: number };

export default function Home() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "admin";
  const isStaff = role === "staff" || role === "manager";

  const [bgVideo, setBgVideo] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Media[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [products, setProducts] = useState<Product[]>([])
  const [fullMedia, setFullMedia] = useState<Media | null>(null);

  useEffect(() => {
    fetch("/api/media?type=background_video")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.media?.length) setBgVideo(d.media[0].url);
      })
      .catch(() => {});
    // Gallery + Stories + Hero + Promo for public home
    Promise.all([
      fetch("/api/media?type=gallery_image").then((r) => r.json()),
      fetch("/api/media?type=story").then((r) => r.json()),
      fetch("/api/media?type=hero_image").then((r) => r.json()),
      fetch("/api/media?type=promo_video").then((r) => r.json()),
    ])
      .then(([g, s, h, p]) => {
        const list = [
          ...(g.ok ? g.media || [] : []),
          ...(s.ok ? s.media || [] : []),
          ...(h.ok ? h.media || [] : []),
          ...(p.ok ? p.media || [] : []),
        ];
        setGallery(list);
      })
      .catch(() => {});
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => d.ok && setServices(d.services || []))
      .catch(() => {});
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => d.ok && setStaff(d.staff || []))
      .catch(() => {});
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => d.ok && setProducts((d.products || []).slice(0, 8)))
      .catch(() => {});
  }, []);

  function isDirectVideo(url: string) {
    if (!url) return false;
    const u = url.toLowerCase();
    // Cloudinary / direct file / common CDNs
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return true;
    if (u.includes("cloudinary.com") && (u.includes("/video/") || u.includes(".mp4"))) return true;
    if (u.includes("res.cloudinary.com")) return true;
    if (url.includes("blob:")) return true;
    // YouTube/Vimeo page links cannot play in <video> — need direct file URL
    if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return false;
    return false;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* ===== 3D / VIDEO BACKGROUND ===== */}
      <div className="fixed inset-0 -z-10">
        {bgVideo ? (
          isDirectVideo(bgVideo) ? (
            <video
              key={bgVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={bgVideo} type="video/mp4" />
              <source src={bgVideo} type="video/webm" />
            </video>
          ) : (
            // Fallback: treat as image URL or show gradient if not playable
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bgVideo})` }}
            />
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#1a2744] to-[#0b1220]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#0b1220]/95" />
        {/* floating orbs 3D feel */}
        <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-[#d4af37]/10 blur-3xl float-anim pointer-events-none" />
        <div
          className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-[#1f4e79]/20 blur-3xl float-anim pointer-events-none"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* ===== NAV ===== */}
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-block mb-6">
            <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-[#d4af37] via-[#f0d78c] to-[#b8860b] flex items-center justify-center text-5xl font-black text-[#0b1220] shadow-2xl card-3d">
              HS
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-[#f0d78c] to-[#d4af37] bg-clip-text text-transparent">
            HARMONIC SALON
          </h1>
          <p className="text-slate-200 text-lg sm:text-xl mb-10 leading-relaxed max-w-xl mx-auto">
            Premium grooming · Multi-service booking · Expert barbers &amp; manicure
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className="btn-glow px-10 py-4 rounded-2xl text-lg shadow-xl">
              Book Appointment
            </Link>
            <Link
              href="/#services"
              className="px-10 py-4 rounded-2xl text-lg border-2 border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 transition font-semibold"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SERVICES (public) ===== */}
      <section id="services" className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-2 text-[#d4af37]">Our Services</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Select on booking page · Prices in QAR</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <Link
                key={s._id}
                href={`/booking?service=${s._id}`}
                className="glass card-3d rounded-2xl p-6 hover:border-[#d4af37]/40 border border-transparent transition"
              >
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{s.category}</div>
                <h3 className="font-bold text-lg mb-2">{s.name}</h3>
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-sm">{s.durationMin} min</span>
                  <span className="text-[#d4af37] font-bold text-xl">{s.price} QAR</span>
                </div>
              </Link>
            ))}
            {services.length === 0 && (
              <p className="col-span-full text-center text-slate-500">Services loading…</p>
            )}
          </div>
          <div className="text-center mt-8">
            <Link href="/booking" className="btn-glow px-8 py-3 rounded-xl inline-block">
              Book Now
            </Link>
          </div>
        </div>
      </section>

      {/* ===== TEAM (public — no commission %) ===== */}
      <section id="team" className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-2 text-[#d4af37]">Our Team</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Choose your preferred specialist when booking</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {staff.map((s) => (
              <Link
                key={s._id}
                href={`/booking?staff=${s._id}`}
                className="glass card-3d rounded-2xl p-5 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#d4af37]/30 to-[#1f4e79]/40 flex items-center justify-center text-2xl font-bold text-[#d4af37]">
                  {s.name.charAt(0)}
                </div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{s.department}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STORE preview ===== */}
      <section id="store" className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-2 text-[#d4af37]">Salon Store</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Premium products · Available in salon</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const soldOut = (p.stock ?? 0) <= 0;
              return (
              <div key={p._id} className={`glass card-3d rounded-2xl p-4 relative ${soldOut ? "opacity-70" : ""}`}>
                {soldOut && <span className="absolute top-2 right-2 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">SOLD OUT</span>}
                <div className="h-24 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 mb-3 flex items-center justify-center text-3xl">
                  ✨
                </div>
                <h3 className="font-medium text-sm">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.category}</p>
                <p className="text-[#d4af37] font-bold mt-1">{p.sellPrice} QAR</p>
              </div>
            );})}
            {products.length === 0 && (
              <p className="col-span-full text-center text-slate-500 text-sm">Products will appear when Admin adds them</p>
            )}
          </div>
          <div className="text-center mt-8">
            <Link href="/store" className="px-6 py-2 rounded-xl border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/10 transition text-sm">
              View full store →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== GALLERY / STORIES / SHOTS (public) ===== */}
      {gallery.length > 0 && (
        <section className="relative z-10 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-3 text-[#d4af37]">Gallery &amp; Stories</h2>
            <p className="text-center text-slate-400 text-sm mb-10">Photos · Shots · Stories from the salon</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map((g) => {
                const isVid =
                  /\.(mp4|webm|ogg|mov)(\?|$)/i.test(g.url || "") ||
                  (g.url || "").toLowerCase().includes("/video/") ||
                  g.type === "promo_video" ||
                  g.type === "story";
                return (
                  <button
                    type="button"
                    key={g._id}
                    onClick={() => setFullMedia(g)}
                    className="card-3d rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 relative text-left w-full"
                  >
                    {isVid ? (
                      <video
                        src={g.url}
                        muted
                        loop
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.url} alt={g.title || "Salon"} className="w-full h-full object-cover" />
                    )}
                    {g.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs px-2 py-1 truncate">
                        {g.title}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="relative z-10 text-center text-slate-500 text-sm py-8 border-t border-white/5">
        © {new Date().getFullYear()} HARMONIC SALON · Doha, Qatar
        {isAdmin && (
          <span className="block mt-2 text-xs text-[#d4af37]/70">
            Admin: upload background video &amp; gallery from Admin → Media
          </span>
        )}
      </footer>

      {/* Fullscreen media viewer */}
      {fullMedia && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullMedia(null)}>
          <button type="button" className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullMedia(null)}>×</button>
          {/\.(mp4|webm|ogg|mov)(\?|$)/i.test(fullMedia.url) || fullMedia.url.includes("/video/") ? (
            <video src={fullMedia.url} controls autoPlay className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fullMedia.url} alt="" className="max-h-[90vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}
