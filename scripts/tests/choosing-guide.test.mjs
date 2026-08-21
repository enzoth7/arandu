import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  OFFICIAL_CHOICE_GUIDE,
  OFFICIAL_CHOICE_GUIDE_SOURCE,
  officialChoiceGuideCanonicalText,
} from "../../lib/official-choice-guide.mjs";

const pagePath = new URL("../../app/(publico)/guia/page.tsx", import.meta.url);
const controlsPath = new URL("../../app/components/ChoosingGuideControls.tsx", import.meta.url);
const stylesPath = new URL("../../app/(publico)/guia/guide.module.css", import.meta.url);
const scrollResetPath = new URL("../../app/components/PublicScrollReset.tsx", import.meta.url);

test("la transcripción oficial conserva estructura, conteos y huella", () => {
  assert.equal(OFFICIAL_CHOICE_GUIDE_SOURCE.version, "2019-01");
  assert.equal(OFFICIAL_CHOICE_GUIDE_SOURCE.sha256, "3f012314aaba1e85efa19e9d4178da2db25a8c4e2d02723db69de566da4ece81");
  assert.equal(OFFICIAL_CHOICE_GUIDE.before.length, 2);
  assert.equal(OFFICIAL_CHOICE_GUIDE.what.length, 1);
  assert.equal(OFFICIAL_CHOICE_GUIDE.how.length, 2);
  assert.equal(OFFICIAL_CHOICE_GUIDE.goodSignals.length, 20);
  assert.equal(OFFICIAL_CHOICE_GUIDE.badSignals.length, 11);
  assert.equal(OFFICIAL_CHOICE_GUIDE.closing.length, 4);

  const transcriptionHash = createHash("sha256").update(officialChoiceGuideCanonicalText(), "utf8").digest("hex");
  assert.equal(transcriptionHash, "49151bb29272f0683fb3793187da854574146c014b4fdf3b6947514865269353");
});

test("la ruta muestra una guía de lectura y no el cuestionario anterior", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /OFFICIAL_CHOICE_GUIDE/);
  assert.match(page, /<ChoosingGuideControls targets=\{GUIDE_TARGETS\}/);
  assert.match(page, /data-guide-section/);
  assert.match(page, /href="\/#mapa-registro"/);
  assert.match(page, /target="_blank" rel="noreferrer"/);
  assert.doesNotMatch(page, /ResidencialesFormView/);
  assert.doesNotMatch(page, /<input|<textarea|<select|<progress|type="checkbox"/i);
});

test("los controles abren, enfocan, expanden, ocultan e imprimen la guía", async () => {
  const controls = await readFile(controlsPath, "utf8");

  assert.match(controls, /section\.setAttribute\("open", ""\)/);
  assert.match(controls, /section\.removeAttribute\("open"\)/);
  assert.match(controls, /summary\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(controls, /prefers-reduced-motion: reduce/);
  assert.match(controls, /section\.scrollIntoView/);
  assert.match(controls, /window\.print\(\)/);
  assert.match(controls, /aria-controls=\{target\.id\}/);
});

test("la impresión revela todo el contenido y el CTA llega al mapa", async () => {
  const [styles, scrollReset] = await Promise.all([
    readFile(stylesPath, "utf8"),
    readFile(scrollResetPath, "utf8"),
  ]);

  assert.match(styles, /@media print/);
  assert.match(styles, /\.accordion:not\(\[open\]\) > \.accordionBody/);
  assert.match(styles, /display: block !important/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(scrollReset, /"#mapa-registro"/);
  assert.match(scrollReset, /requestedTarget\.scrollIntoView/);
  assert.match(scrollReset, /hashTargetRetries < 20/);
});
