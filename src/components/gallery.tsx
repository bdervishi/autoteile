"use client";
import { useState } from "react";
import type { PublicItem } from "@/lib/listing.types";
import { CategoryIcon } from "./icons";
export function Gallery({ item }: { item: PublicItem }) {
  const [current, setCurrent] = useState(0);
  return (
    <>
      <div className="detail-gallery">
        {item.photos[current] ? (
          <img
            src={item.photos[current]}
            alt={`${item.title} · Foto ${current + 1}`}
          />
        ) : (
          <CategoryIcon category={item.category} size={120} />
        )}
      </div>
      {item.photos.length > 1 && (
        <div className="thumbs">
          {item.photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Foto ${i + 1} anzeigen`}
              aria-pressed={i === current}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
