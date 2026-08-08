import Image from "next/image";
import Link from "next/link";
import { Building2, UserRound } from "lucide-react";

/**
 * Puerta de entrada: elegir portal. Es un componente de servidor porque son dos
 * enlaces y un logotipo — no necesita JavaScript en el cliente.
 */
export function AccessChooser() {
  return <main className="accessGate">
    <div className="accessGatePanel">
      <Image
        src="/mascerca.png"
        alt="Más Cerca"
        className="accessGateLogo"
        width={1254}
        height={1254}
        priority
      />
      <p className="accessGateLead">Elegí cómo querés ingresar</p>
      <div className="accessChoiceGrid">
        <Link href="/personas" className="accessChoiceCard accessChoicePerson">
          <span className="accessChoiceIcon"><UserRound size={42}/></span>
          <strong>Soy una persona</strong>
          <small>Orientación, consultas y comunicación de preocupaciones</small>
        </Link>
        <Link href="/organizacion/login" className="accessChoiceCard accessChoiceOrganization">
          <span className="accessChoiceIcon"><Building2 size={42}/></span>
          <strong>Soy de la organización</strong>
          <small>Acceso a equipos, gestión institucional y fuentes</small>
        </Link>
      </div>
    </div>
  </main>;
}
