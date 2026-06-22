import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sweepstakes-rules")({
  head: () => ({
    meta: [
      { title: "Reglas Oficiales del Sorteo — HAZOREX ORIGEN" },
      { name: "description", content: "Reglas Oficiales del Sweepstakes diario de HAZOREX ORIGEN — sin compra necesaria, residentes de EE.UU. 18+." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#1e3a5f" }}>
      <Link to="/ruleta" style={{ color: "#1e3a5f" }}>← Volver a la Ruleta</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>Reglas Oficiales del Sorteo (Official Rules)</h1>
      <p style={{ color: "#666", fontSize: 13 }}>Última actualización: Junio 2026</p>

      <p style={{ background: "#f4f1ea", padding: 16, borderRadius: 12, fontWeight: 700 }}>
        NO ES NECESARIA UNA COMPRA PARA PARTICIPAR O GANAR. UNA COMPRA NO INCREMENTA LAS PROBABILIDADES DE GANAR.
        VOID WHERE PROHIBITED.
      </p>

      <h2>1. Patrocinador (Sponsor)</h2>
      <p>
        HAZOREX ORIGEN LLC (el "Patrocinador"), <em>[DIRECCIÓN POSTAL OFICIAL A COMPLETAR]</em>.
        Contacto: soporte@hazorex.com.
      </p>

      <h2>2. Elegibilidad</h2>
      <p>
        Abierto exclusivamente a personas físicas residentes legales de los 50 estados de EE.UU. y el
        Distrito de Columbia que tengan 18 años o más al momento de participar.{" "}
        <strong>VOID en Florida (FL), Nueva York (NY) y Rhode Island (RI)</strong> y donde la ley lo
        prohíba. No son elegibles empleados, contratistas, directores, ni familiares directos
        (cónyuge, padres, hijos, hermanos) ni personas que vivan en el mismo hogar del Patrocinador,
        sus afiliadas, agencias o socios.
      </p>

      <h2>3. Período del Sorteo</h2>
      <p>
        El sorteo se ejecuta diariamente. Cada "Sorteo Diario" comienza a las 12:00 AM hora del Este
        (ET) y cierra entradas a las 7:55 PM ET (5 minutos antes del sorteo). El ganador se selecciona
        a las 8:00 PM ET del mismo día. Sorteos continuos a partir de la fecha de publicación de
        estas reglas.
      </p>

      <h2>4. Cómo Participar</h2>
      <p>
        Hay dos métodos de participación con <strong>igual peso</strong> en el sorteo (1 boleto = 1
        oportunidad ponderada):
      </p>
      <h3>4.1 Método de Compra</h3>
      <p>
        Compra un paquete de "Estrellas" y conviértelas en boletos a razón de 10 Estrellas = 1
        boleto. Sin límite superior de boletos pagados, sujeto a saldo disponible.
      </p>
      <h3>4.2 Participación Gratuita (AMOE — Alternate Method Of Entry)</h3>
      <p>
        Para participar sin compra, completa el formulario gratuito en{" "}
        <Link to="/ruleta" style={{ color: "#1e3a5f", fontWeight: 700 }}>hazorex.com/ruleta</Link>{" "}
        proporcionando nombre legal completo, dirección postal completa en EE.UU., correo electrónico,
        teléfono, fecha de nacimiento (debes ser mayor de 18), y un ensayo original de al menos 300
        palabras sobre por qué te gusta la marca ORIGEN. <strong>Cada envío válido equivale a 1
        boleto con el mismo peso que un boleto comprado.</strong>
      </p>
      <p>
        <strong>Alternativa postal</strong>: envía una postal escrita a mano (no fotocopia) con tus
        datos completos (mismos campos que el formulario web) más la frase "ENTRADA GRATUITA SORTEO
        HAZOREX [FECHA]" a:{" "}
        <em>HAZOREX ORIGEN LLC, AMOE Entry, [DIRECCIÓN POSTAL A COMPLETAR]</em>. Cada postal válida y
        recibida antes de las 7:55 PM ET equivale a 1 boleto. Límite: 1 entrada AMOE por persona y
        por día (incluyendo postales y web combinadas). Máximo 3 entradas por dirección IP por día.
      </p>

      <h2>5. Premios y Valor Aproximado (ARV)</h2>
      <p>
        El premio diario es el monto del Prize Pool acumulado del día en USD, financiado por el 50% de
        cada compra de Estrellas más el rollover de pozos no reclamados. <strong>Valor mínimo
        garantizado: $25 USD. Valor máximo aproximado (ARV): variable, publicado en tiempo real en la
        página del sorteo.</strong> Sin equivalente en efectivo más allá del monto del pozo. No
        transferible.
      </p>

      <h2>6. Probabilidades de Ganar</h2>
      <p>
        Las probabilidades de ganar dependen del número total de boletos elegibles recibidos para el
        sorteo de cada día. (Odds of winning depend on the number of eligible entries received.)
      </p>

      <h2>7. Selección del Ganador y Sistema Aleatorio</h2>
      <p>
        El ganador se selecciona el mismo día a las 8:00 PM ET mediante un algoritmo determinístico
        ponderado por boletos, usando una semilla criptográfica (SHA-256) que combina la fecha del
        sorteo, el total de boletos y un UUID aleatorio del servidor. El hash de la semilla
        (seed_hash) se publica con cada resultado para verificación pública.
      </p>

      <h2>8. Notificación al Ganador y Reclamo del Premio</h2>
      <p>
        El ganador será notificado por correo electrónico al email registrado en su entrada en un
        plazo máximo de 24 horas. El ganador tiene <strong>14 días naturales</strong> desde la
        notificación para reclamar el premio en{" "}
        <span style={{ fontFamily: "monospace" }}>hazorex.com/claim/[fecha]</span> proporcionando:
      </p>
      <ul>
        <li>Documento de identidad oficial con foto (driver's license, state ID, o pasaporte).</li>
        <li>Formulario W-9 firmado del IRS (requerido para todos los premios; obligatorio si &gt; $600 USD para emisión de 1099-MISC).</li>
        <li>Dirección postal completa y método de pago (PayPal, Zelle o cheque por correo).</li>
      </ul>
      <p>
        Si el ganador no reclama dentro del periodo de 14 días, o si no cumple con los requisitos de
        elegibilidad, el premio se considerará renunciado y pasará automáticamente al pozo del
        siguiente sorteo (rollover).
      </p>

      <h2>9. Responsabilidad Fiscal</h2>
      <p>
        El ganador es el único responsable de todos los impuestos federales, estatales y locales
        sobre el premio. Para premios cuyo valor agregado anual a un mismo ganador iguale o supere
        $600 USD, el Patrocinador emitirá el Formulario 1099-MISC al IRS y al ganador conforme a la
        ley estadounidense.
      </p>

      <h2>10. Liberación de Responsabilidad (Release)</h2>
      <p>
        Al participar, los participantes liberan al Patrocinador, sus afiliados, directores,
        empleados y agentes de toda reclamación, daño o responsabilidad derivada de la participación,
        aceptación, posesión, uso o mal uso del premio.
      </p>

      <h2>11. Privacidad y Manejo de Datos</h2>
      <p>
        Los datos personales recolectados se usan exclusivamente para administrar el sorteo, verificar
        elegibilidad, contactar al ganador y cumplir obligaciones fiscales. Consulta nuestra{" "}
        <Link to="/terms" style={{ color: "#1e3a5f" }}>Política de Privacidad</Link>.
      </p>

      <h2>12. Disputas y Ley Aplicable</h2>
      <p>
        Cualquier disputa se regirá por las leyes del Estado de Delaware, EE.UU., sin aplicar sus
        principios de conflicto de leyes. Las partes acuerdan resolver disputas mediante arbitraje
        vinculante individual en Wilmington, Delaware. <strong>No se permiten demandas colectivas
        (no class actions).</strong>
      </p>

      <h2>13. Lista de Ganadores</h2>
      <p>
        Disponible públicamente en{" "}
        <Link to="/ruleta" style={{ color: "#1e3a5f" }}>hazorex.com/ruleta</Link> (sección "Ganadores
        recientes") o bajo solicitud escrita por correo postal a la dirección del Patrocinador
        durante los 90 días posteriores a cada sorteo.
      </p>

      <h2>14. Modificaciones</h2>
      <p>
        El Patrocinador se reserva el derecho de modificar, suspender o cancelar el sorteo en
        cualquier momento por causa justificada (fraude, fallo técnico, fuerza mayor). Cualquier
        cambio material se publicará en esta página con fecha actualizada.
      </p>

      <p style={{ marginTop: 32, fontSize: 12, color: "#888" }}>
        © {new Date().getFullYear()} HAZOREX ORIGEN LLC · Todos los derechos reservados.
      </p>
    </main>
  );
}
