import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones del piloto de Arandú.",
};

export default function TerminosPage() {
  return (
    <article className="card legalPage">
      <header className="legalHeader">
        <p className="eyebrow">Arandú</p>
        <h1>Términos y condiciones de Arandú</h1>
        <div className="legalMeta">
          <p><strong>Última actualización:</strong> 21 de agosto de 2026</p>
          <p><strong>Aplicable al:</strong> Piloto de Arandú</p>
        </div>
      </header>

      <aside className="aranduDemoBanner" aria-label="Aviso sobre el prototipo académico">
        <ShieldAlert size={24} aria-hidden="true" />
        <p>
          <strong>PROTOTIPO ACADÉMICO</strong> · Arandú es un prototipo académico. No es un servicio oficial, no sustituye a los organismos públicos y no debe utilizarse como canal de emergencias o denuncias.
        </p>
      </aside>

      <section className="legalSection">
        <p>Gracias por usar Arandú.</p>
        <p>
          Estos Términos regulan la creación de una cuenta y el uso de Arandú durante el piloto. Cuando decimos &ldquo;Arandú&rdquo;, &ldquo;nosotros&rdquo; o &ldquo;nuestro&rdquo;, nos referimos al proyecto académico y a su Plataforma.
        </p>
        <p>
          Al marcar la casilla correspondiente y crear una cuenta, aceptás estos Términos. Leelos con atención. Si no estás de acuerdo, no crees una cuenta ni uses las funciones que exigen registro.
        </p>
        <p>
          Las autorizaciones para compartir datos con un Verificador, enviar datos de una visita a un ELEPEM o publicar una experiencia se solicitan por separado en el momento correspondiente. Aceptar estos Términos no autoriza por sí solo ninguna de esas acciones.
        </p>
      </section>

      <section className="legalSummaryCard">
        <h2>Resumen de estos Términos</h2>
        <ul>
          <li>Arandú reúne información sobre establecimientos de larga estadía para personas mayores (&ldquo;ELEPEM&rdquo;), permite solicitar visitas y, durante el piloto, recibir experiencias de residentes, familiares o personas allegadas y visitantes con un vínculo comprobado por el procedimiento previsto en estos Términos.</li>
          <li>Arandú no habilita ni inspecciona ELEPEM, no presta cuidados ni servicios de salud, no decide admisiones y no es parte del contrato entre una persona y un establecimiento. Tampoco es un servicio de emergencia ni un canal oficial de denuncias.</li>
          <li>Una etiqueta de vínculo verificado indica que se completó un procedimiento. No garantiza la identidad de una persona, la verdad de todo lo que publica, la calidad de un establecimiento ni la ausencia de riesgos. Las experiencias se revisan antes de publicarse y el ELEPEM no recibe la identidad de quien las escribió.</li>
        </ul>
        <p className="legalNote"><em>Este resumen sirve para orientarte, pero no reemplaza el texto completo que sigue.</em></p>
      </section>

      <nav className="legalToc" aria-label="Índice de contenidos">
        <h2>Índice</h2>
        <ul>
          <li>
            <a href="#seccion-a">A. Términos para todas las personas usuarias</a>
            <ol>
              <li><a href="#a1">A1. Definiciones</a></li>
              <li><a href="#a2">A2. Sobre estos Términos</a></li>
              <li><a href="#a3">A3. Quién puede usar Arandú</a></li>
              <li><a href="#a4">A4. Cuenta, contraseña y seguridad</a></li>
              <li><a href="#a5">A5. Perfiles y permisos</a></li>
              <li><a href="#a6">A6. Solicitudes de visita</a></li>
              <li><a href="#a7">A7. Verificación de vínculos</a></li>
              <li><a href="#a8">A8. Experiencias y reseñas</a></li>
              <li><a href="#a9">A9. Reglas de contenido</a></li>
              <li><a href="#a10">A10. Moderación, publicación y apelación</a></li>
              <li><a href="#a11">A11. Información, puntuaciones y orden de resultados</a></li>
              <li><a href="#a12">A12. Privacidad y datos personales</a></li>
              <li><a href="#a13">A13. Propiedad intelectual</a></li>
              <li><a href="#a14">A14. Reglas de uso de la Plataforma</a></li>
              <li><a href="#a15">A15. Suspensión y cierre de cuenta</a></li>
              <li><a href="#a16">A16. Situaciones urgentes y organismos competentes</a></li>
              <li><a href="#a17">A17. El rol de Arandú</a></li>
            </ol>
          </li>
          <li>
            <a href="#seccion-b">B. Términos para representantes de ELEPEM</a>
            <ol>
              <li><a href="#b1">B1. Cuenta institucional</a></li>
              <li><a href="#b2">B2. Información del establecimiento y agenda de visitas</a></li>
              <li><a href="#b3">B3. Respuestas, reportes y conflictos de interés</a></li>
            </ol>
          </li>
          <li>
            <a href="#seccion-c">C. Disposiciones generales</a>
            <ol>
              <li><a href="#c1">C1. Disponibilidad y servicios de terceros</a></li>
              <li><a href="#c2">C2. Gratuidad, pagos y publicidad</a></li>
              <li><a href="#c3">C3. Responsabilidad</a></li>
              <li><a href="#c4">C4. Cambios a estos Términos</a></li>
              <li><a href="#c5">C5. Comunicaciones</a></li>
              <li><a href="#c6">C6. Ley aplicable y controversias</a></li>
              <li><a href="#c7">C7. Otras disposiciones</a></li>
            </ol>
          </li>
        </ul>
      </nav>

      <div className="legalBody">
        <h2 id="seccion-a" className="legalSectionHeading">A. Términos para todas las personas usuarias</h2>

        <section id="a1">
          <h3>A1. Definiciones</h3>
          <dl className="legalDefinitions">
            <dt><strong>Cuenta:</strong></dt>
            <dd>El acceso personal que creás para usar las funciones registradas de Arandú.</dd>
            <dt><strong>ELEPEM:</strong></dt>
            <dd>Un establecimiento de larga estadía para personas mayores incluido o mencionado en la Plataforma.</dd>
            <dt><strong>Experiencia:</strong></dt>
            <dd>La opinión, evaluación o comentario que una persona envía acerca de un ELEPEM.</dd>
            <dt><strong>Moderador:</strong></dt>
            <dd>El rol encargado de revisar contenido y adoptar decisiones de publicación.</dd>
            <dt><strong>Verificador:</strong></dt>
            <dd>La persona u organización independiente que comprueba determinados vínculos durante el piloto.</dd>
            <dt><strong>Vínculo verificado:</strong></dt>
            <dd>El estado que Arandú muestra cuando se completó el procedimiento correspondiente a una persona residente, familiar o allegada, o a una visita realizada.</dd>
          </dl>
        </section>

        <section id="a2">
          <h3>A2. Sobre estos Términos</h3>
          <p>Estos Términos se aplican a todas las personas que crean una cuenta. La sección B agrega reglas específicas para quienes administran información o funciones de un ELEPEM.</p>
          <p>La aceptación electrónica queda registrada con la cuenta, la versión del documento, la fecha y hora y los datos técnicos mínimos necesarios para dejar constancia.</p>
          <p>Si una disposición específica de una función contradice una regla general, se aplica la disposición específica solo respecto de esa función y en la medida permitida por la ley.</p>
        </section>

        <section id="a3">
          <h3>A3. Quién puede usar Arandú</h3>
          <p>Para crear una cuenta tenés que tener al menos 18 años y capacidad para aceptar estos Términos. Arandú no está dirigida a niñas, niños o adolescentes.</p>
          <p>La edad, la residencia en un ELEPEM o la necesidad de apoyos no eliminan por sí solas la capacidad para decidir. Si actuás como representante legal de otra persona, podemos pedirte que acredites esa facultad por un procedimiento separado. Esto no autoriza a sustituir la voluntad de la persona mayor cuando puede expresarla.</p>
        </section>

        <section id="a4">
          <h3>A4. Cuenta, contraseña y seguridad</h3>
          <p>La cuenta es personal. Al registrarte, te pediremos nombre, correo electrónico o número de celular, una contraseña y la confirmación de que tenés 18 años o más. También registraremos la aceptación de estos Términos. No necesitás entregar una cédula para abrir la cuenta durante el piloto.</p>
          <p>Todas las cuentas ingresan normalmente con contraseña. Podemos enviarte un código temporal para confirmar tu correo o celular, recuperar la contraseña o reforzar la seguridad. Ese código no reemplaza la contraseña ni debe guardarse para volver a usarlo.</p>
          <p>Tenés que proporcionar información correcta, mantener actualizado tu contacto, elegir una contraseña segura y no compartirla. No se permiten cuentas compartidas, aunque varias personas trabajen en el mismo ELEPEM.</p>
          <p>Sos responsable de las acciones realizadas desde tu cuenta cuando dependan de tu conducta. Si sospechás un acceso no autorizado, cambiá la contraseña de inmediato. Arandú puede pedir una confirmación adicional o bloquear temporalmente el acceso si detecta un riesgo razonable.</p>
        </section>

        <section id="a5">
          <h3>A5. Perfiles y permisos</h3>
          <p>Los permisos dependen de la función de la cuenta y se limitan a lo necesario para esa función. Una misma persona puede tener vínculos con más de un ELEPEM, pero declarar un vínculo no otorga permisos institucionales.</p>
          <ul>
            <li>La <strong>cuenta personal</strong> permite gestionar los propios datos, solicitar visitas, pedir la verificación de vínculos y enviar experiencias.</li>
            <li>La <strong>cuenta de representante de ELEPEM</strong> permite gestionar información declarada por el establecimiento, su agenda y sus respuestas públicas. No permite conocer la identidad de quien escribió una experiencia.</li>
            <li>El <strong>Verificador</strong> solo puede acceder a los casos asignados y a los datos necesarios para resolverlos. No puede leer experiencias ni respuestas del ELEPEM.</li>
            <li>El <strong>Moderador</strong> revisa contenido seudonimizado. No debe recibir la identidad de la persona autora ni la evidencia utilizada para verificar el vínculo.</li>
            <li>El <strong>personal técnico o de seguridad</strong> solo puede acceder cuando resulte necesario para operar, proteger o cumplir la ley, con controles y registro de acceso.</li>
          </ul>
        </section>

        <section id="a6">
          <h3>A6. Solicitudes de visita</h3>
          <p>Arandú puede permitirte solicitar una entrevista o visita a un ELEPEM. La solicitud no reserva una plaza, no confirma disponibilidad y no obliga al establecimiento a aceptar la fecha propuesta.</p>
          <p>Antes de enviar la solicitud, te mostraremos qué datos recibirá el ELEPEM elegido. Por lo general serán tu nombre, un medio de contacto, la cantidad de asistentes, las fechas preferidas y cualquier necesidad de accesibilidad que decidas informar. El envío requiere una autorización separada para esa visita.</p>
          <p>El ELEPEM debe usar esos datos para coordinar la visita y para las obligaciones directamente relacionadas. No puede usarlos para publicidad no solicitada ni recibir información sobre si luego enviaste una experiencia.</p>
          <p>Una visita se considera realizada cuando queda registrada como completada por el procedimiento definido en la Plataforma. Ese registro puede habilitar un vínculo de visitante. No acredita residencia, parentesco ni conocimiento prolongado del establecimiento.</p>
        </section>

        <section id="a7">
          <h3>A7. Verificación de vínculos</h3>
          <p>Para mostrar desde qué lugar habla cada persona, Arandú distingue entre residente, familiar o persona allegada y visitante. La verificación de residentes y familiares o allegados la realiza el Verificador independiente. El ELEPEM no participa en esa comprobación caso por caso y no recibe la identidad de quien la solicita.</p>
          <p>Al iniciar el trámite, te pediremos que elijas el ELEPEM, el tipo de vínculo, desde cuándo existe aproximadamente y si continúa vigente. El Verificador puede pedir información adicional o revisar evidencia. Antes de hacerlo, debe informarte quién es, qué datos necesita, para qué los usará, durante cuánto tiempo los conservará y cómo podés ejercer tus derechos.</p>
          <p>Durante el piloto, Arandú no recibe ni guarda la cédula, una foto del documento, el nombre de la persona residente, historias clínicas, diagnósticos, medicación, contratos, audios, videos ni otros documentos usados como evidencia. El Verificador comunica solamente el resultado, la categoría de vínculo, el ELEPEM, un período amplio, la vigencia y un identificador seudónimo.</p>
          <p>El vínculo puede vencer, renovarse, discutirse o revocarse. La etiqueta pública puede decir, por ejemplo, &ldquo;familiar vinculado desde 2024&rdquo; o &ldquo;visitó en 2026&rdquo;. No muestra el nombre de la persona residente ni permite al ELEPEM saber qué cuenta está detrás de la experiencia.</p>
          <p>La expresión &ldquo;vínculo verificado&rdquo; significa que se completó este procedimiento. Reduce el riesgo de experiencias sin vínculo, pero no es una certificación de identidad, conducta, seguridad, habilitación, legalidad o exactitud de todo lo que se diga.</p>
        </section>

        <section id="a8">
          <h3>A8. Experiencias y reseñas</h3>
          <p>Solo podés enviar una experiencia propia y de primera mano. Si sos familiar o persona allegada, podés contar lo que observaste y, cuando corresponda, referirte a la experiencia de la persona residente si tenés una base suficiente para hacerlo y respetás su voluntad, privacidad y dignidad.</p>
          <p>Al enviar una experiencia, tenés que indicar el vínculo y el período correctos, diferenciar lo que viste de lo que te contaron y no presentar como seguro algo que no pudiste comprobar. No se permite publicar a cambio de dinero, descuentos, beneficios, amenazas o favores.</p>
          <p>Las experiencias de residentes, familiares o allegados y visitantes pueden mostrarse por separado. Si alguna categoría tiene una ponderación distinta en la puntuación, la metodología se publicará de forma comprensible antes de aplicarse.</p>
          <p>Enviar una experiencia no la vuelve pública. Primero queda en estado privado y pasa por moderación. Si se prepara una versión pública, te mostraremos el texto y la etiqueta de vínculo. La publicación exige una autorización específica, separada de la aceptación de estos Términos.</p>
        </section>

        <section id="a9">
          <h3>A9. Reglas de contenido</h3>
          <p>Tu contenido tiene que ser auténtico, pertinente para el ELEPEM evaluado y respetuoso de los derechos de otras personas. Una experiencia no se elimina por ser crítica o negativa.</p>
          <p>No podés enviar o publicar contenido que:</p>
          <ul>
            <li>sea deliberadamente falso, fabricado, copiado o ajeno a una experiencia real;</li>
            <li>incluya amenazas, acoso, odio, discriminación, humillaciones, lenguaje degradante o incitación a la violencia;</li>
            <li>revele nombres, cédulas, teléfonos, imágenes, datos de salud, comunicaciones privadas u otros datos que identifiquen a residentes, familiares, trabajadores o terceros;</li>
            <li>atribuya delitos o infracciones a una persona identificada o identificable, o presente rumores como hechos comprobados;</li>
            <li>busque extorsionar, castigar una negativa o conseguir un pago, descuento o trato especial;</li>
            <li>haya sido encargado o manipulado por un ELEPEM, un competidor o alguien con un conflicto de interés no declarado;</li>
            <li>infrinja derechos de autor, marcas, confidencialidad, secretos o derechos de imagen; o</li>
            <li>contenga publicidad, spam, enlaces maliciosos, código dañino o instrucciones para eludir los controles de la Plataforma.</li>
          </ul>
          <p>Durante el piloto no se admiten audios, videos ni documentos adjuntos en las experiencias. Tampoco debés escribir nombres, diagnósticos, medicación, historias clínicas o cualquier dato que permita reconocer a otra persona en los campos de texto.</p>
        </section>

        <section id="a10">
          <h3>A10. Moderación, publicación y apelación</h3>
          <p>Un Moderador revisa cada experiencia antes de publicarla. Puede pedir una aclaración, corregir errores evidentes de formato o retirar datos que identifiquen a alguien, pero no debe cambiar el sentido de lo que dijiste.</p>
          <p>Si la versión pública cambia de manera relevante el texto enviado, vamos a pedirte que la apruebes. La publicación será seudonimizada: mostrará la categoría y el período del vínculo, pero no tu nombre, contacto ni la identidad de la persona residente.</p>
          <p>Arandú puede rechazar, limitar la visibilidad, retirar o restaurar contenido cuando infrinja estos Términos o las reglas de contenido y reseñas. La decisión explica la razón y permite solicitar una revisión humana, salvo que la notificación cree un riesgo concreto para una persona, la seguridad de la Plataforma o una actuación legal legítima.</p>
          <p>Las herramientas automáticas pueden ayudar a detectar spam, duplicados o posibles datos personales. Una decisión que produzca un efecto importante sobre tu cuenta o contenido no se tomará únicamente por medios automáticos sin una vía de revisión humana.</p>
          <p>Podés retirar la autorización de publicación. La experiencia deja de mostrarse en un plazo razonable, sin perjuicio de copias técnicas temporales y registros mínimos que deban conservarse.</p>
        </section>

        <section id="a11">
          <h3>A11. Información, puntuaciones y orden de resultados</h3>
          <p>En una ficha pueden aparecer tres clases de información: datos provenientes de fuentes oficiales, información declarada por el ELEPEM y experiencias de personas usuarias. Arandú indicará de dónde proviene cada dato y, cuando corresponda, la fecha de actualización.</p>
          <p>La presencia de un ELEPEM en una ficha, lista o mapa no es una recomendación, certificación ni garantía de habilitación. Los datos oficiales pueden cambiar y deben verificarse en la fuente competente.</p>
          <p>Si mostramos puntuaciones, promedios, etiquetas o un orden de resultados, explicaremos las categorías evaluadas, la escala, las ponderaciones, el tratamiento de respuestas como &ldquo;no pude evaluarlo&rdquo;, la antigüedad considerada y el mínimo de experiencias necesario. No cambiaremos la metodología de forma retroactiva para favorecer o perjudicar a un establecimiento.</p>
          <p>Cualquier publicidad, patrocinio o promoción que influya en la presentación se identificará claramente y no alterará en secreto la moderación ni la puntuación.</p>
        </section>

        <section id="a12">
          <h3>A12. Privacidad y datos personales</h3>
          <p>Arandú trata los datos necesarios para gestionar cuentas, coordinar visitas, verificar vínculos, moderar experiencias y proteger la Plataforma. La información sobre qué datos se usan, con quién se comparten, dónde se alojan y durante cuánto tiempo se conservan se presenta junto con la función correspondiente.</p>
          <p>Arandú aplica criterios de minimización, separación de funciones, seudonimización, control de acceso y registro de operaciones. La información de vínculo no se usa para publicidad ni para inferir salud, dependencia, patrimonio o capacidad.</p>
          <p>Podés solicitar acceso, rectificación, actualización, inclusión o supresión de tus datos. Algunas constancias pueden conservarse durante el plazo informado cuando exista una obligación legal, una necesidad de seguridad, prevención de fraude o defensa de derechos.</p>
          <p>Si proporcionás datos de otra persona para una visita, verificación o representación, tenés que contar con una base legítima y limitarte a lo necesario. Ser familiar o allegado no te convierte automáticamente en representante legal ni te autoriza a revelar información de salud, documentos o decisiones de la persona residente.</p>
          <p>Si en el futuro Arandú necesitara tratar documentos de identidad, datos de salud, u otra información sensible que hoy no recibe, deberá informarlo antes, explicar la base jurídica y aplicar controles adicionales. Ese cambio no queda autorizado por estos Términos.</p>
        </section>

        <section id="a13">
          <h3>A13. Propiedad intelectual</h3>
          <p>Conservás los derechos sobre el contenido que creás. Cuando autorizás la publicación de una experiencia, concedés a Arandú una licencia no exclusiva, gratuita y limitada para alojarla, reproducirla técnicamente, moderarla, adaptarla para accesibilidad y mostrar la versión aprobada dentro de la Plataforma.</p>
          <p>La licencia dura mientras el contenido permanezca publicado y durante el tiempo técnico necesario para copias de seguridad y cumplimiento legal. Arandú no puede vender tu relato, usarlo en publicidad identificable ni licenciarlo para entrenar modelos de inteligencia artificial o realizar investigaciones sin una autorización separada, específica y opcional.</p>
          <p>El nombre, las marcas, el software, el diseño y los materiales propios de Arandú pertenecen a sus titulares. Podés usarlos solo en la medida necesaria para acceder normalmente a la Plataforma.</p>
        </section>

        <section id="a14">
          <h3>A14. Reglas de uso de la Plataforma</h3>
          <p>Usá Arandú de buena fe, tratá a las demás personas con respeto y cumplí la ley. No ayudés a otras personas a eludir estos Términos.</p>
          <ul>
            <li>No suplantes a otra persona, no transfieras tu cuenta y no crees cuentas masivas o duplicadas para evitar una medida.</li>
            <li>No manipules verificaciones, visitas, experiencias, respuestas, puntuaciones ni resultados de búsqueda.</li>
            <li>No intentes acceder a cuentas o datos ajenos, probar vulnerabilidades sin autorización, interferir con la seguridad o afectar el funcionamiento de la Plataforma.</li>
            <li>No uses bots, scrapers u otros medios automatizados para extraer datos sin autorización escrita.</li>
            <li>No uses información obtenida en Arandú para acosar, discriminar, tomar represalias, hacer publicidad no solicitada o identificar a quien publicó una experiencia.</li>
            <li>No vendas accesos, evidencias de vínculo ni cualquier función de la Plataforma.</li>
          </ul>
        </section>

        <section id="a15">
          <h3>A15. Suspensión y cierre de cuenta</h3>
          <p>Podemos advertir, limitar una función, retirar contenido, suspender temporalmente o cerrar una cuenta cuando exista un incumplimiento, fraude, manipulación, riesgo de privacidad o seguridad, obligación legal o un perjuicio grave para otras personas.</p>
          <p>La medida será proporcional a la situación. En general, te informaremos qué ocurrió, qué regla se aplicó, cuánto dura la medida y cómo pedir una revisión. Cuando sea posible, te daremos la oportunidad de corregir. Podemos actuar de inmediato ante un riesgo urgente y ofrecer la revisión después.</p>
          <p>Toda medida incluye una posibilidad de revisión. Siempre que sea posible, la revisión la realiza una persona distinta de quien tomó la decisión inicial.</p>
          <p>Podés cerrar tu cuenta. El cierre no elimina obligaciones anteriores ni impide conservar registros mínimos por los motivos y plazos informados al momento de la solicitud.</p>
        </section>

        <section id="a16">
          <h3>A16. Situaciones urgentes y organismos competentes</h3>
          <p>Arandú no recibe emergencias y una experiencia no es el medio adecuado para pedir protección inmediata. Tampoco sustituye denuncias, inspecciones o actuaciones del Ministerio de Salud Pública, el Ministerio de Desarrollo Social, el Ministerio del Interior, la Justicia, la Institución Nacional de Derechos Humanos u otras autoridades.</p>
          <p>Si existe un riesgo inmediato para la vida o la integridad de una persona, llamá al <strong>9-1-1</strong> o acudí a la autoridad competente. Para orientación sobre derechos, abuso o maltrato de personas mayores y para consultas sobre habilitación o fiscalización de ELEPEM, consultá directamente la información oficial vigente del <strong>Ministerio de Desarrollo Social</strong> y del <strong>Ministerio de Salud Pública</strong>.</p>
          <p>No prometemos investigar, derivar o hacer seguimiento de una preocupación si no existe un convenio, un equipo responsable y un protocolo aprobado. Hasta entonces, esa función permanece deshabilitada. Ante una situación que requiera intervención, la persona debe acudir directamente al organismo público competente.</p>
        </section>

        <section id="a17">
          <h3>A17. El rol de Arandú</h3>
          <p>Arandú ofrece una Plataforma para consultar información, coordinar visitas y compartir experiencias. No es un ELEPEM, un prestador de salud, una agencia de colocación, una autoridad pública, un organismo de habilitación o inspección, un asesor jurídico ni un servicio de emergencia.</p>
          <p>Arandú no decide admisiones, disponibilidad, precios, planes de cuidado o tratamientos y no es parte del contrato de alojamiento o cuidados entre una persona y un ELEPEM. Una visita, una ficha o una puntuación no reemplazan recorrer el lugar, verificar fuentes oficiales, leer el contrato y obtener asesoramiento cuando resulte necesario.</p>
        </section>

        <h2 id="seccion-b" className="legalSectionHeading">B. Términos para representantes de ELEPEM</h2>

        <section id="b1">
          <h3>B1. Cuenta institucional</h3>
          <p>Para administrar funciones de un ELEPEM necesitás una cuenta personal vinculada a una cuenta institucional. Debés proporcionar tu nombre, contacto laboral, función o cargo, el ELEPEM al que representás y la información razonable que permita comprobar tu autorización.</p>
          <p>Declarás que tenés facultades para actuar por el establecimiento en las funciones que uses. Si cambia tu cargo, termina tu vínculo o dejás de estar autorizado, tenés que informarlo de inmediato. El acceso institucional puede retirarse sin cerrar tu cuenta personal.</p>
          <p>No se permiten credenciales compartidas. Cada integrante del equipo tiene que usar su propia cuenta y solo los permisos necesarios.</p>
        </section>

        <section id="b2">
          <h3>B2. Información del establecimiento y agenda de visitas</h3>
          <p>El ELEPEM es responsable de que la información que declara sea completa, clara, exacta y esté actualizada, incluidos sus servicios, accesibilidad, costos, condiciones de ingreso, horarios, contacto, disponibilidad y cualquier afirmación sobre habilitación.</p>
          <p>Arandú puede pedir respaldo, identificar la información como declarada por el establecimiento, registrar la fecha de actualización, rechazar afirmaciones engañosas o suspender su publicación mientras se revisan. Esto no convierte a Arandú en autoridad de inspección ni traslada la responsabilidad del ELEPEM.</p>
          <p>Los datos recibidos para una visita solo pueden usarse para coordinarla y cumplir obligaciones relacionadas. No pueden agregarse a listas comerciales, compartirse con terceros para otros fines ni utilizarse para averiguar quién publicó una experiencia.</p>
        </section>

        <section id="b3">
          <h3>B3. Respuestas, reportes y conflictos de interés</h3>
          <p>El ELEPEM puede responder públicamente a una experiencia, pedir la corrección de información institucional o reportar contenido que considere contrario a las reglas. Las respuestas están sujetas a la misma moderación que el resto del contenido.</p>
          <p>La respuesta no puede identificar, amenazar, desacreditar de forma personal, contactar por fuera de la Plataforma ni tomar represalias contra quien pudo haber escrito la experiencia. El ELEPEM no recibe la identidad de la persona autora, su evidencia de vínculo ni el borrador privado.</p>
          <p>Los reportes deben indicar un motivo concreto, por ejemplo datos personales, falta de vínculo, conflicto de interés, amenaza o falsedad manifiesta. Arandú los evaluará de forma imparcial, pero no actúa como tribunal y puede no estar en condiciones de resolver todas las controversias sobre hechos.</p>
          <p>Representantes, trabajadores, proveedores y personas con intereses económicos en un ELEPEM no pueden manipular sus experiencias ni las de establecimientos competidores. Si participan en una función permitida, deben declarar el conflicto; Arandú puede excluir ese contenido de puntuaciones o exigir que se publique únicamente como respuesta institucional.</p>
        </section>

        <h2 id="seccion-c" className="legalSectionHeading">C. Disposiciones generales</h2>

        <section id="c1">
          <h3>C1. Disponibilidad y servicios de terceros</h3>
          <p>Trabajamos para mantener la Plataforma disponible y corregir errores, pero puede haber mantenimiento, interrupciones o cambios técnicos. Cuando una modificación afecte de forma importante una función comprometida, la comunicaremos con antelación razonable cuando sea posible.</p>
          <p>La Plataforma puede incluir enlaces o integraciones con fuentes oficiales, mapas, correo, mensajería u otros servicios. Esos servicios tienen sus propias condiciones. Arandú sigue siendo responsable de elegir y controlar adecuadamente a quienes tratan datos por su cuenta, pero no controla sitios externos a los que accedés por decisión propia.</p>
        </section>

        <section id="c2">
          <h3>C2. Gratuidad, pagos y publicidad</h3>
          <p>La creación de la cuenta y las funciones incluidas en el piloto son gratuitas. Si en el futuro ofrecemos una función paga, antes de contratar vamos a informar el precio total, la forma de pago, la duración, las condiciones de cancelación y los derechos que correspondan, incluido el derecho a dejar sin efecto una contratación a distancia cuando la ley lo prevea.</p>
          <p>Si incorporamos publicidad, patrocinio o contenido promocionado, se identificará de manera clara. Un pago no podrá modificar en secreto una puntuación, una decisión de moderación o la etiqueta de verificación.</p>
        </section>

        <section id="c3">
          <h3>C3. Responsabilidad</h3>
          <p>Cada persona responde por la información y el contenido que proporciona. Cada ELEPEM responde por sus servicios, contratos, conductas e información declarada. Arandú responde por sus propias obligaciones como operador de la Plataforma de acuerdo con la ley.</p>
          <p>No garantizamos que un ELEPEM sea adecuado para una persona, que toda información de terceros esté siempre completa o actualizada o que una verificación elimine el fraude. Cuando tengamos conocimiento de un error relevante en la Plataforma, tomaremos medidas razonables para revisarlo y, si corresponde, corregirlo.</p>
          <p>Nada en estos Términos excluye o limita responsabilidad por dolo, culpa, negligencia, incumplimiento, tratamiento de datos personales u otros supuestos en los que la ley no permita hacerlo. Tampoco implica una renuncia a derechos de consumidores, titulares de datos, personas mayores o cualquier otra persona protegida.</p>
        </section>

        <section id="c4">
          <h3>C4. Cambios a estos Términos</h3>
          <p>Podemos actualizar estos Términos por cambios legales, de seguridad o de las funciones de Arandú. La nueva versión indicará la fecha de actualización.</p>
          <p>Los cambios materiales se comunicarán con al menos 30 días de anticipación y requerirán tu aceptación expresa antes de seguir usando las funciones afectadas. Tu silencio o el solo paso del tiempo no se considerarán aceptación. Si no estás de acuerdo, podés cerrar la cuenta.</p>
          <p>Un cambio urgente exigido por la ley o necesario para responder a un riesgo de seguridad puede aplicarse antes, con aviso tan pronto como resulte razonablemente posible y sin reducir derechos ya adquiridos.</p>
        </section>

        <section id="c5">
          <h3>C5. Comunicaciones</h3>
          <p>Podemos enviarte mensajes operativos sobre la cuenta, seguridad, visitas, verificación, moderación y cambios contractuales al correo o celular que elegiste. Mantené ese contacto actualizado.</p>
          <p>Las comunicaciones promocionales, si existieran, requieren una opción separada y pueden cancelarse sin perder la cuenta. Arandú procura ofrecer información y funciones en formatos accesibles.</p>
        </section>

        <section id="c6">
          <h3>C6. Ley aplicable y controversias</h3>
          <p>Estos Términos se rigen por las leyes de la República Oriental del Uruguay.</p>
          <p>Nada en estos Términos limita el derecho de acudir a Defensa del Consumidor, la Unidad Reguladora y de Control de Datos Personales, la Institución Nacional de Derechos Humanos, otros organismos competentes o los tribunales uruguayos.</p>
          <p>Estos Términos no imponen arbitraje obligatorio, un fuero extranjero ni la renuncia a acciones colectivas o a otros derechos reconocidos por la ley.</p>
        </section>

        <section id="c7">
          <h3>C7. Otras disposiciones</h3>
          <p>Si una parte de estos Términos se considera inválida o inaplicable, se interpretará o integrará de acuerdo con la ley y, cuando sea posible, el resto seguirá vigente.</p>
          <p>La demora en exigir una obligación no significa que renunciemos a hacerlo. Vos tampoco perdés un derecho por no ejercerlo inmediatamente cuando la ley disponga lo contrario.</p>
          <p>No podés transferir tu cuenta ni ceder estos Términos a otra persona. Arandú solo podrá ceder su posición contractual cuando la ley lo permita, informando con claridad quién será responsable y sin reducir tus derechos.</p>
        </section>
      </div>

      <footer className="legalFooter">
        <Link className="legalBackLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" /> Volver al sitio público
        </Link>
      </footer>
    </article>
  );
}
