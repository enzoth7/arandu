"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Heart,
  HeartHandshake,
  RotateCcw,
  Users,
} from "lucide-react";

import { AGENDA_ACTIVITIES } from "./agendaData";
import { Modal } from "./Modal";

const ActivityMap = dynamic(() => import("./ActivityMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Cargando mapa de actividades…</div>,
});

export interface ActivityItem {
  id: string;
  icon: string;
  category: string;
  title: string;
  place: string;
  zone: string;
  moment: "Entre semana" | "Fin de semana";
  freeOnly: boolean;
  accessible: boolean;
  smallGroups: boolean;
  interests: string[];
  time: string;
  color: string;
  lat: number;
  lng: number;
  description: string;
  organizer: string;
  sourceUrl?: string;
}

export const ACTIVITIES_DATA: ActivityItem[] = AGENDA_ACTIVITIES;

const ZONES = [
  "Todos los departamentos",
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];
const MOMENTS = ["Cualquier momento", "Entre semana", "Fin de semana"];
const MODALITIES = ["Todas las modalidades", "Presencial", "Online (Virtual)"];
const INTEREST_OPTIONS = ["Moverme", "Aprender", "Cultura", "Conocer gente"];


export function ActivitiesView() {
  const [searchText, setSearchText] = useState("");
  const [zone, setZone] = useState("Todos los departamentos");
  const [moment, setMoment] = useState("Cualquier momento");
  const [modality, setModality] = useState("Todas las modalidades");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [smallGroups, setSmallGroups] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "mixed" | "map">("mixed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActivityItem | null | "support">(null);
  const [sentNotice, setSentNotice] = useState(false);
  const [savedFavorites, setSavedFavorites] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("arandu_activity_favorites");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedFavorites(parsed);
      }
    } catch {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id];
      try {
        localStorage.setItem("arandu_activity_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Helper para saber si una actividad es online/virtual
  const isOnlineActivity = (act: ActivityItem) => {
    const text = `${act.title} ${act.place} ${act.category} ${act.description}`.toLowerCase();
    return /zoom|virtual|online|webinar|videollamada|desde casa/i.test(text);
  };

  // Filtrado reactivo de actividades
  const filteredActivities = useMemo(() => {
    return ACTIVITIES_DATA.filter((act) => {
      if (onlyFavorites && !savedFavorites.includes(act.id)) return false;
      if (zone !== "Todos los departamentos" && act.zone !== zone) return false;
      if (moment !== "Cualquier momento" && act.moment !== moment) return false;

      if (modality === "Presencial" && isOnlineActivity(act)) return false;
      if (modality === "Online (Virtual)" && !isOnlineActivity(act)) return false;

      if (selectedInterests.length > 0 && !selectedInterests.some((i) => act.interests.includes(i))) return false;
      if (freeOnly && !act.freeOnly) return false;
      if (accessible && !act.accessible) return false;
      if (smallGroups && !act.smallGroups) return false;

      if (searchText.trim()) {
        const text = searchText.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(text);
        const matchPlace = act.place.toLowerCase().includes(text);
        const matchCat = act.category.toLowerCase().includes(text);
        const matchZone = act.zone.toLowerCase().includes(text);
        const matchDesc = act.description.toLowerCase().includes(text);
        if (!matchTitle && !matchPlace && !matchCat && !matchZone && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [zone, moment, modality, selectedInterests, freeOnly, accessible, smallGroups, searchText, onlyFavorites, savedFavorites]);

  const selectedActivity = useMemo(() => {
    if (!filteredActivities.length) return null;
    return (selectedId ? filteredActivities.find((a) => a.id === selectedId) : null) || filteredActivities[0];
  }, [filteredActivities, selectedId]);


  const clearFilters = () => {
    setZone("Todos los departamentos");
    setMoment("Cualquier momento");
    setModality("Todas las modalidades");
    setSelectedInterests([]);
    setFreeOnly(false);
    setAccessible(false);
    setSmallGroups(false);
    setSearchText("");
    setOnlyFavorites(false);
    setSelectedId(null);
  };


  return (
    <section className="activitiesSection">
      {/* Header / Hero de Actividades */}
      <div className="heroCardActivities">
        <h1>Encontrá actividades que tengan sentido para vos.</h1>
        <p className="heroLead">
          En el buscador ingresá tu dirección para ver actividades cercanas o aquellas que estás buscando. 
        </p>

        <div className="searchBoxHero">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ej.: Música, Gimnasia, Centro Cultural, etc."
          />
        </div>
      </div>

      {/* Barra de control de vista y filtros */}
      <div className="activitiesToolbar">
        <div className="viewSwitchers">
          <button
            type="button"
            className={`viewBtn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            Vista de lista
          </button>
          <button
            type="button"
            className={`viewBtn ${viewMode === "mixed" ? "active" : ""}`}
            onClick={() => setViewMode("mixed")}
          >
            Vista mixta
          </button>
          <button
            type="button"
            className={`viewBtn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            Vista solo del mapa
          </button>
        </div>
      </div>

      {/* Panel principal con filtros + Lista/Mapa */}
      <div className={`activitiesMainLayout view-${viewMode}`}>
        {/* Panel lateral de Filtros Avanzados */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <div className="sidebarColumn" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <aside className="filtersSidebar">
              <div className="sidebarHeaderRow">
                <h3><Filter size={17} /> Filtros</h3>
                <button
                  type="button"
                  className="resetFiltersSidebarBtn"
                  onClick={clearFilters}
                  title="Reiniciar todos los filtros"
                >
                  <RotateCcw size={13} /> Reiniciar
                </button>
              </div>

              <div className="filterBlock">
                <label htmlFor="zoneSelect">Departamento</label>
                <select
                  id="zoneSelect"
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setSelectedId(null);
                  }}
                >
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filterBlock">
                <label htmlFor="momentSelect">Momento</label>
                <select id="momentSelect" value={moment} onChange={(e) => setMoment(e.target.value)}>
                  {MOMENTS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filterBlock">
                <label htmlFor="modalitySelect">Modalidad</label>
                <select id="modalitySelect" value={modality} onChange={(e) => setModality(e.target.value)}>
                  {MODALITIES.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filterBlock checkboxesBlock">
                <span className="filterTitle">Me interesa</span>
                {INTEREST_OPTIONS.map((opt) => {
                  const isChecked = selectedInterests.includes(opt);
                  return (
                    <label key={opt} className="checkboxLabel">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInterests((prev) => [...prev, opt]);
                          } else {
                            setSelectedInterests((prev) => prev.filter((i) => i !== opt));
                          }
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              <div className="filterBlock checkboxesBlock">
                <span className="filterTitle">Preferencias</span>
                <label className="checkboxLabel">
                  <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
                  <span>Solo gratuitas</span>
                </label>
                <label className="checkboxLabel">
                  <input type="checkbox" checked={smallGroups} onChange={(e) => setSmallGroups(e.target.checked)} />
                  <span>Grupos pequeños</span>
                </label>
              </div>
            </aside>

            {/* Botón de Favoritos del mismo ancho que el panel izquierdo */}
            <div style={{ width: "100%" }}>
              <button
                type="button"
                className={`favSidebarBtn ${onlyFavorites ? "active" : ""}`}
                onClick={() => setOnlyFavorites((prev) => !prev)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 18px",
                  borderRadius: 14,
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  background: onlyFavorites ? "#fee2e2" : "#ffffff",
                  color: onlyFavorites ? "#dc2626" : "#0f172a",
                  border: onlyFavorites ? "1.5px solid #fca5a5" : "1.5px solid #cbd5e1",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  transition: "all 0.16s ease",
                }}
              >
                <Heart
                  size={17}
                  fill={onlyFavorites || savedFavorites.length > 0 ? "#ef4444" : "none"}
                  color={onlyFavorites || savedFavorites.length > 0 ? "#ef4444" : "#64748b"}
                />
                <span>Favoritos ({savedFavorites.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Lista de Tarjetas de Actividades */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <div className="activitiesListContainer">
            <div className="listSummaryHeader">
              <h2>Actividades disponibles ({filteredActivities.length})</h2>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="noResultsBox">
                <Calendar size={38} />
                <p>No se encontraron actividades con las preferencias seleccionadas.</p>
                <button type="button" className="clearFiltersBtn" onClick={clearFilters}>
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="activitiesGrid">
                {filteredActivities.map((act) => {
                  const isSelected = selectedActivity?.id === act.id;
                  return (
                    <article
                      key={act.id}
                      className={`activityCard ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedId(act.id)}
                    >
                      <div className="cardBadgeHeader">
                        <span className="catBadge" style={{ color: act.color, borderColor: act.color }}>
                          {act.icon} {act.category}
                        </span>
                        <span className="zoneBadge">{act.zone}</span>
                      </div>
                      <h3>{act.title}</h3>
                      <div className="actPlaceRow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <p className="actPlace" style={{ margin: 0 }}>📍 {act.place}</p>
                        <button
                          type="button"
                          className="favHeartBtn"
                          onClick={(e) => toggleFavorite(e, act.id)}
                          title={savedFavorites.includes(act.id) ? "Quitar de guardados" : "Guardar actividad"}
                          aria-label="Guardar actividad"
                          style={{
                            border: 0,
                            background: "transparent",
                            cursor: "pointer",
                            padding: 2,
                            display: "inline-flex",
                            alignItems: "center",
                            color: savedFavorites.includes(act.id) ? "#ef4444" : "#94a3b8",
                            transition: "transform 0.16s ease",
                          }}
                        >
                          <Heart
                            size={18}
                            fill={savedFavorites.includes(act.id) ? "#ef4444" : "none"}
                          />
                        </button>
                      </div>
                      <p className="actDesc">{act.description}</p>

                      <div className="actMetaGrid">
                        <div><Clock size={14} /> {act.time}</div>
                        <div><Users size={14} /> {act.organizer}</div>
                      </div>

                      <div className="actTagsRow">
                        {act.freeOnly && <span className="tagChip tagGreen">Gratuito</span>}
                        {act.accessible && <span className="tagChip tagBlue">Accesible</span>}
                        {act.smallGroups && <span className="tagChip tagAmber">Grupos reducidos</span>}
                      </div>

                      <div className="cardActionsRow" style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          className="actDetailBtn"
                          style={{ flex: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(act.id);
                            setActiveModal(act);
                          }}
                        >
                          Ver detalle <ChevronRight size={16} />
                        </button>
                        {act.sourceUrl && (
                          <a
                            href={act.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="actSourceBtn"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              padding: "10px 16px",
                              borderRadius: 12,
                              fontWeight: 800,
                              fontSize: "0.88rem",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "1.5px solid #1d4ed8",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                              transition: "all 0.16s ease",
                              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
                            }}
                          >
                            Ir al sitio <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Panel con Mapa Interactivo Leaflet */}
        {(viewMode === "mixed" || viewMode === "map") && (
          <div className="mapPanelContainer">
            <div className="mapHeader">
              <h3>📍 Mapa de Actividades</h3>
            </div>
            <div className="mapFrame">
              <ActivityMap
                activities={filteredActivities}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
            {selectedActivity && (
              <div className="mapSelectedDetail">
                <div>
                  <strong>{selectedActivity.icon} {selectedActivity.title}</strong>
                  <p>{selectedActivity.place} · {selectedActivity.zone} · {selectedActivity.time}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(selectedActivity)}>
                  Ver detalle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal interactivo de Detalle o Acompañamiento */}
      {activeModal && (
        <Modal
          open
          onClose={() => { setActiveModal(null); setSentNotice(false); }}
          className="activitiesModal"
          title={activeModal === "support" ? "Solicitar ayuda personalizada" : "Detalle de la actividad"}
        >

            {activeModal === "support" ? (
              <div className="modalSupportBody">
                <div className="modalEyebrow"><HeartHandshake size={18} /> Acompañamiento +Cerca</div>
                <h2>Solicitar ayuda personalizada</h2>
                <p>
                  Completá este formulario simple de demostración para recibir información o ayuda para sumarte a actividades en tu barrio.
                </p>
                {sentNotice ? (
                  <div className="modalSuccessMsg">
                    <CheckCircle2 size={32} />
                    <strong>¡Solicitud de demostración enviada!</strong>
                    <p>Un facilitador de Ibirapitá o Alerta Mayor se comunicará a la brevedad.</p>
                    <button type="button" className="modalConfirmBtn" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSentNotice(true);
                    }}
                    className="modalForm"
                  >
                    <label>
                      <span>Tu nombre / Contacto (Ficticio para la demo)</span>
                      <input placeholder="Ej.: María Rodríguez" required />
                    </label>
                    <label>
                      <span>Barrio o zona</span>
                      <input placeholder="Ej.: Cordón / Pocitos" defaultValue={zone !== "Todas las zonas" ? zone : ""} />
                    </label>
                    <label>
                      <span>¿Qué tipo de actividad buscás?</span>
                      <textarea defaultValue={searchText} placeholder="Contanos brevemente qué te gustaría hacer..." />
                    </label>
                    <button type="submit" className="modalSubmitBtn">
                      Enviar consulta de demostración
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="modalDetailBody">
                <div className="modalEyebrow">{activeModal.icon} {activeModal.category}</div>
                <h2>{activeModal.title}</h2>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <p className="modalPlace" style={{ margin: 0 }}>📍 <strong>{activeModal.place}</strong> ({activeModal.zone})</p>
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, activeModal.id)}
                    title={savedFavorites.includes(activeModal.id) ? "Quitar de guardados" : "Guardar actividad"}
                    aria-label="Guardar actividad"
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      color: savedFavorites.includes(activeModal.id) ? "#ef4444" : "#94a3b8",
                    }}
                  >
                    <Heart
                      size={22}
                      fill={savedFavorites.includes(activeModal.id) ? "#ef4444" : "none"}
                    />
                  </button>
                </div>

                <div className="modalFacts">
                  <div><strong>Horario:</strong> <span>{activeModal.time}</span></div>
                  <div><strong>Momento:</strong> <span>{activeModal.moment}</span></div>
                  <div><strong>Organiza:</strong> <span>{activeModal.organizer}</span></div>
                  <div><strong>Costo:</strong> <span>{activeModal.freeOnly ? "Gratuito" : "Sin costo"}</span></div>
                </div>

                <p className="modalDescription">{activeModal.description}</p>

                <div className="modalTags">
                  {activeModal.accessible && <span className="tagChip tagBlue">Accesibilidad Confirmada</span>}
                  {activeModal.smallGroups && <span className="tagChip tagAmber">Grupos Pequeños</span>}
                  <span className="tagChip tagGreen">Inscripción Abierta</span>
                </div>

                {sentNotice ? (
                  <div className="modalSuccessMsg">
                    <CheckCircle2 size={28} />
                    <strong>¡Consulta registrada en la demostración!</strong>
                    <p>Se envió la solicitud para participar en {activeModal.title}.</p>
                    <button type="button" className="modalConfirmBtn" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
                      Volver a las actividades
                    </button>
                  </div>
                ) : (
                  <div className="modalActions" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" className="modalSubmitBtn" style={{ flex: 1 }} onClick={() => setSentNotice(true)}>
                      Inscribirme / Consultar vacante
                    </button>
                    {activeModal.sourceUrl && (
                      <a
                        href={activeModal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modalSourceBtn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "12px 18px",
                          borderRadius: 12,
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "1.5px solid #1d4ed8",
                          textDecoration: "none",
                          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
                        }}
                      >
                        Ir al sitio <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
        </Modal>
      )}
    </section>
  );
}
