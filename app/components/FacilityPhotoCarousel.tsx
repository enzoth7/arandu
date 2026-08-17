"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type FacilityPhotoCarouselProps = {
  facilityName: string;
  photoUrls: string[];
};

function normalizedPhotoUrls(photoUrls: string[]) {
  return [...new Set(photoUrls.filter((url) => typeof url === "string" && url.trim()))];
}

export function FacilityPhotoCarousel({ facilityName, photoUrls }: FacilityPhotoCarouselProps) {
  const photos = useMemo(() => normalizedPhotoUrls(photoUrls), [photoUrls]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxRef = useRef<HTMLDialogElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const photoCount = photos.length;
  const activePhoto = photos[activeIndex] || photos[0];

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [facilityName, photos]);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (lightboxOpen && !dialog.open) dialog.showModal();
    if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);

  const showPhoto = useCallback((nextIndex: number) => {
    if (photoCount === 0) return;
    setActiveIndex((nextIndex + photoCount) % photoCount);
  }, [photoCount]);

  const showPrevious = useCallback(() => showPhoto(activeIndex - 1), [activeIndex, showPhoto]);
  const showNext = useCallback(() => showPhoto(activeIndex + 1), [activeIndex, showPhoto]);

  const openLightbox = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  const visibleThumbnails = useMemo(() => {
    const visibleCount = Math.min(5, photoCount);
    const start = Math.min(
      Math.max(activeIndex - Math.floor(visibleCount / 2), 0),
      Math.max(photoCount - visibleCount, 0),
    );
    return photos.slice(start, start + visibleCount).map((url, offset) => ({
      index: start + offset,
      url,
    }));
  }, [activeIndex, photoCount, photos]);

  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (photoCount < 2 || lightboxOpen) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  const handleLightboxKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    event.stopPropagation();
    if (photoCount < 2) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  if (!activePhoto) return null;

  return (
    <section className="facilityPhotoCarousel" aria-label={`Galería de fotos de ${facilityName}`} onKeyDown={handleCarouselKeyDown}>
      <div className="facilityCarouselStage">
        <button
          type="button"
          className="facilityCarouselImageButton"
          onClick={openLightbox}
          aria-label={`Ampliar foto ${activeIndex + 1} de ${photoCount} de ${facilityName}`}
        >
          <Image
            key={activePhoto}
            src={activePhoto}
            alt={`Vista ${activeIndex + 1} del ELEPEM ${facilityName}`}
            width={960}
            height={640}
            sizes="(max-width: 900px) calc(100vw - 48px), 560px"
            unoptimized
          />
          <span className="facilityCarouselExpand" aria-hidden="true"><Maximize2 size={18} />Ampliar</span>
        </button>

        {photoCount > 1 && (
          <>
            <button type="button" className="facilityCarouselArrow isPrevious" onClick={showPrevious} aria-label="Ver foto anterior">
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <button type="button" className="facilityCarouselArrow isNext" onClick={showNext} aria-label="Ver foto siguiente">
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          </>
        )}

        <output className="facilityCarouselCount" aria-live="polite" aria-atomic="true">
          {activeIndex + 1} / {photoCount}
        </output>
      </div>

      {photoCount > 1 && (
        <div className="facilityCarouselThumbnails" role="group" aria-label="Elegir una foto">
          {visibleThumbnails.map((photo) => (
            <button
              type="button"
              className={photo.index === activeIndex ? "isActive" : ""}
              onClick={() => showPhoto(photo.index)}
              aria-label={`Ver foto ${photo.index + 1} de ${photoCount}`}
              aria-current={photo.index === activeIndex ? "true" : undefined}
              key={photo.url}
            >
              <Image
                src={photo.url}
                alt=""
                width={180}
                height={120}
                sizes="110px"
                unoptimized
              />
              <span>{photo.index + 1}</span>
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={lightboxRef}
        className="facilityPhotoLightbox"
        aria-labelledby="facility-photo-lightbox-title"
        onClose={(event) => {
          event.stopPropagation();
          closeLightbox();
        }}
        onCancel={(event) => event.stopPropagation()}
        onKeyDown={handleLightboxKeyDown}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
      >
        <div className="facilityPhotoLightboxSurface">
          <header>
            <div>
              <h2 id="facility-photo-lightbox-title">{facilityName}</h2>
              <p>Foto {activeIndex + 1} de {photoCount}</p>
            </div>
            <button type="button" onClick={closeLightbox} aria-label="Cerrar imagen ampliada" title="Cerrar">
              <X size={24} aria-hidden="true" />
            </button>
          </header>
          <div className="facilityPhotoLightboxStage">
            {photoCount > 1 && (
              <button type="button" className="isPrevious" onClick={showPrevious} aria-label="Ver foto anterior">
                <ChevronLeft size={30} aria-hidden="true" />
              </button>
            )}
            <Image
              key={`lightbox-${activePhoto}`}
              src={activePhoto}
              alt={`Vista ampliada ${activeIndex + 1} del ELEPEM ${facilityName}`}
              width={1800}
              height={1200}
              sizes="96vw"
              unoptimized
            />
            {photoCount > 1 && (
              <button type="button" className="isNext" onClick={showNext} aria-label="Ver foto siguiente">
                <ChevronRight size={30} aria-hidden="true" />
              </button>
            )}
          </div>
          {photoCount > 1 && <p className="facilityPhotoLightboxHint">Usá las flechas o las teclas ← → para recorrer la galería.</p>}
        </div>
      </dialog>
    </section>
  );
}
