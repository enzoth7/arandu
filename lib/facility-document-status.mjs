/**
 * Clasificación documental para orientar la lectura de fuentes oficiales.
 * No representa calidad, seguridad ni una evaluación del ELEPEM.
 */
export function facilityDocumentStatus(facility) {
  if (facility?.mspFinal && facility?.midesSocial) {
    return { key: "outstanding", label: "Sobresaliente", stars: 4, tone: "strong-green" };
  }
  if (facility?.mspFinal || facility?.midesSocial) {
    return { key: "good", label: "Bueno", stars: 3, tone: "light-green" };
  }
  return { key: "needs-improvement", label: "Requiere mejoras", stars: 2, tone: "yellow" };
}

export function facilityDocumentStatusDescription(status) {
  if (status.key === "outstanding") return "Constan habilitación final MSP y certificado social MIDES.";
  if (status.key === "good") return "Consta habilitación final MSP o certificado social MIDES.";
  return "No consta habilitación final MSP ni certificado social MIDES en las fuentes consultadas.";
}
