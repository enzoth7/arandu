export const OFFICIAL_CHOICE_GUIDE_SOURCE = Object.freeze({
  title: "Elegir un centro de larga estadía: ¿qué tener en cuenta?",
  year: 2019,
  url: "https://itolluaivfoxnaohbsdk.supabase.co/storage/v1/object/public/pdf/Recomendaciones.pdf",
  sha256: "3f012314aaba1e85efa19e9d4178da2db25a8c4e2d02723db69de566da4ece81",
  version: "2019-01",
});

export const OFFICIAL_CHOICE_GUIDE = Object.freeze({
  before: Object.freeze([
    "Visitá varios centros. Hacelo en un horario prudente, que respete a las personas que viven ahí.",
    "Es un derecho de las personas mayores participar de la elección, sus opiniones deben ser tenidas en cuenta. Aunque la persona mayor que está eligiendo el centro tenga algún impedimento para tomar sola la decisión, siempre existen aspectos sobre los que puede opinar y preferencias que puede haber manifestado a lo largo de su vida y que deben ser respetadas.",
  ]),
  what: Object.freeze([
    "Son hogares o residenciales que brindan, en forma permanente, cuidados a personas mayores. Ofrecen vivienda, alimentación, actividades y servicios.",
  ]),
  how: Object.freeze([
    "Elegí lugares que cuenten con habilitación o que estén en proceso de obtenerla. De esta forma, los centros garantizan los requisitos básicos de infraestructura y los recursos humanos necesarios para ofrecer cuidados.",
    "Los ministerios de Salud y de Desarrollo Social regulan y fiscalizan. Puedes solicitar la documentación probatoria de la habilitación o del inicio del trámite en el mismo centro.",
  ]),
  goodSignals: Object.freeze([
    "La casa cuenta con ventilación y luz natural. Además, tiene sistemas de calefacción y refrigeración que aseguran una temperatura adecuada.",
    "La casa cuenta con carteles que indican que ahí funciona un centro de este tipo.",
    "La persona encargada te recibe y permite que conozcas las instalaciones.",
    "El olor es agradable al entrar; a limpio y a comida pronta.",
    "La disposición de los ambientes te permite circular de forma segura y cómoda.",
    "Hay “buen ambiente” entre las personas que viven y las que trabajan.",
    "Las personas que viven ahí son llamadas por su nombre.",
    "Las personas que trabajan están formadas para cuidar y cuentan con capacitación en primeros auxilios.",
    "La información del día y hora en la que podés encontrar a la persona encargada de la dirección técnica médica es clara.",
    "Las personas que viven en la casa pueden entrar y salir libremente.",
    "Las personas que viven en el centro disponen de los medios de comunicación que desean.",
    "El menú semanal está a la vista. Se confecciona de acuerdo a las necesidades y gustos de cada persona.",
    "Las actividades planificadas son variadas e incluyen paseos y salidas en horarios apropiados. Están adaptadas a los gustos y las posibilidades de las personas residentes. Las fechas y horarios están a la vista.",
    "Los baños son suficientes y accesibles.",
    "La intimidad en el momento de la higiene y el uso del baño es respetada.",
    "Los horarios de visita son amplios.",
    "La intimidad con las visitas está asegurada.",
    "Las personas residentes pueden decorar sus dormitorios con elementos personales.",
    "Las personas residentes acceden a sus documentos personales y manejan su jubilación, pasividad o dinero.",
    "Se establece un contrato claro, con las condiciones del servicio y la forma de pago explicitadas.",
  ]),
  badSignals: Object.freeze([
    "El centro no tiene una persona encargada de la dirección técnica médica.",
    "Las habitaciones tienen trancas externas o enganches para candados desde afuera.",
    "Las camas están unidas unas a otras y no hay espacio para circular libremente entre ellas.",
    "Los horarios de visita tienen grandes restricciones.",
    "Las personas no están con ropa acorde al horario o al clima.",
    "Muchas personas están sentadas dormitando o con la mirada perdida y sin interactuar.",
    "Muchas personas están con medidas físicas de contención.",
    "El uso de pañales “por precaución” es habitual.",
    "Los documentos personales de las personas residentes son retenidos por el personal.",
    "La medicación no está almacenada correctamente.",
    "Hay cámara de videovigilancia en espacios privados como los dormitorios o los baños.",
  ]),
  closing: Object.freeze([
    "Las personas residentes, familiares y allegadas son quienes ayudan a monitorear el buen funcionamiento del centro.",
    "Material elaborado en base al decreto 356/016.",
    "Juntos cuidamos mejor.",
    "0800 1811 · *1811 antel",
  ]),
});

export function officialChoiceGuideCanonicalText() {
  return [
    ...OFFICIAL_CHOICE_GUIDE.before,
    ...OFFICIAL_CHOICE_GUIDE.what,
    ...OFFICIAL_CHOICE_GUIDE.how,
    ...OFFICIAL_CHOICE_GUIDE.goodSignals,
    ...OFFICIAL_CHOICE_GUIDE.badSignals,
    ...OFFICIAL_CHOICE_GUIDE.closing,
  ].join("\n");
}
