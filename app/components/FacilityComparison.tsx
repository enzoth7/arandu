"use client";

import { useMemo } from "react";
import { comparisonRows, NOT_AVAILABLE } from "../../lib/facility-comparison.mjs";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import { facilityDisplayLabel } from "./facility-presentation";
import { Modal } from "./Modal";
import type { Facility } from "./map-types";

/**
 * Comparación de dos o tres ELEPEM.
 *
 * Se dibuja como tabla real: cada columna es un establecimiento y cada fila un
 * dato. Así un lector de pantalla anuncia «Ubicación, Hogar Las Acacias,
 * Paysandú» al recorrer la celda, cosa que una grilla de <div> no permite.
 */
export function FacilityComparison({
  facilities,
  open,
  onClose,
}: {
  facilities: Facility[];
  open: boolean;
  onClose: () => void;
}) {
  const rows = useMemo(
    () => comparisonRows(facilities, {
      canonicalDepartmentOf: canonicalDepartment,
      institutionalLabelOf: facilityDisplayLabel,
    }),
    [facilities],
  );

  if (!facilities.length) return null;

  return (
    <Modal open={open} onClose={onClose} className="comparisonDialog" labelledBy="comparison-title">
      <header className="comparisonHeader">
        <h2 id="comparison-title">Comparar ELEPEM</h2>
        <p>
          Se muestran los mismos datos para cada establecimiento. No hay puntajes ni orden de preferencia:
          la comparación sirve para preparar preguntas, no para elegir por vos.
        </p>
      </header>

      <div className="comparisonTableScroll">
        <table className="comparisonTable">
          <caption className="visuallyHidden">
            Comparación de {facilities.length} establecimientos de larga estadía
          </caption>
          <thead>
            <tr>
              <th scope="col">Dato</th>
              {facilities.map((facility) => (
                <th scope="col" key={facility.id}>
                  <span className="comparisonFacilityName">{facility.name}</span>
                  <small>{facility.locality}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td
                    key={facilities[index].id}
                    className={value === NOT_AVAILABLE ? "comparisonMissing" : undefined}
                  >{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="comparisonNote">
        «{NOT_AVAILABLE}» significa que ese dato todavía no fue relevado. No indica que el establecimiento
        no lo tenga ni que esté en situación irregular.
      </p>
    </Modal>
  );
}
