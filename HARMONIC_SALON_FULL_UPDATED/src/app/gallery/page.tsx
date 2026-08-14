"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

type Media = { _id: string; type: string; url: string; title?: string; thumbnailUrl?: string };

export default function GalleryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [full, setFull] = useState<Media | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/media?type=gallery_image").then((r) => r.json()),
      fetch("/api/media?type=story").then((r) => r.json()),
      fetch("/api/media?type=promo_video").then((r) => r.json()),
      fetch("/api/media?type=hero_image").then((r) => r.json()),
    ]).then(([g, s, p, h]) => {
      const list = [
        ...(g.ok ? g.media || [] : []),
        ...(s.ok ? s.media || [] : []),
        ...(p.ok ? p.media || [] : []),
        ...(h.ok ? h.media || [] : []),
      ];
      setItems(list);
    });
  }, []);

  function isVideo(url: string) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes("/video/");
  }

  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-center text-[#d4af37] mb-2">Gallery & Stories</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Tap any photo or video for full screen</p>
        {items.length === 0 && (
          <p className="text-center text-slate-500">No media yet · Admin can upload from Admin → Media</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => setFull(m)}
              className="glass rounded-2xl overflow-hidden aspect-square relative group"
            >
              {isVideo(m.url) ? (
                <video src={m.url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnailUrl || m.url} alt={m.title || ""} className="w-full h-full object-cover" />
              )}
              <span className="absolute bottom-2 left-2 text-[10px] uppercase bg-black/60 px-2 py-0.5 rounded">
                {m.type.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {full && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFull(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-3xl px-4"
            onClick={() => setFull(null)}
          >
            ×
          </button>
          {isVideo(full.url) ? (
            <video src={full.url} controls autoPlay className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={full.url} alt={full.title || ""} className="max-h-[90vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}
