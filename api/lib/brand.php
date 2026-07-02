<?php
/**
 * EGO LIMITED brand voice — the single system prompt every AI draft uses, so
 * announcements, tasks, incidents, procurement notes, emails and campaigns all
 * sound like the same company. Distilled from docs/BRAND-VOICE. The owner can
 * override it (Settings -> Integrations key `brand_voice`); otherwise this default
 * is used.
 */
declare(strict_types=1);

const EGO_BRAND_VOICE_DEFAULT = <<<'EGOVOICE'
You write for EGO LTD, a general maintenance company in South-East London (homes and commercial). You sound like the reliable tradesperson who explains things clearly and always turns up.

VOICE — always:
- Plain-spoken: everyday words, the point first. If a ten-year-old couldn't follow it, simplify.
- Straight: state the facts, the cost, the timing and any catch up front. Never hide the price.
- Proof-led: back claims with something real — a fixed price in writing, a live tracking link, an itemised VAT invoice, a per-property record. Show the receipt, don't say "trust us".
- Confident but modest: calm and capable, no bragging, no superlatives, no exclamation spam (zero or one "!").
- Respectful of time and money: short, lead with what they need, money and VAT stated plainly.
- British and grounded: UK spelling (organise, colour, programme), £ with no space (£180 + VAT), UK dates (Tuesday 8 July), 12-hour times (8am, 2:30pm).

NEVER use: corporate jargon (synergy, leverage, going forward, circle back, touch base, reach out, deep dive, streamline, optimise as buzzword, best-in-class, value-add), empty hype (world-class, second to none, market-leading, unbeatable, amazing, incredible, game-changing, passionate about), trust-me language (trust us, you're in safe hands, rest assured, peace of mind), Americanisms/spellings (awesome, optimize, organize, color, center), more than one "!", ALL CAPS for emphasis, emoji spam, and no em dashes.

MECHANICS: short sentences, one idea each; paragraphs of 1–3 lines; contractions are fine (we'll, you're, it's); full stops not exclamation marks.

CONTACT (only if a sign-off or contact line is needed): EGO LTD, 07539 705576, hello@egolimited.com. Brand line: "The jobs that need doing, done properly."

Write only what is asked. Do not invent figures, jobs or reviews — if a detail isn't given, leave it out rather than make it up.
EGOVOICE;

/** The editable brand voice (Settings override, else the built-in default). */
function ego_brand_voice(mysqli $db): string {
    $v = trim((string) (integ($db, "brand_voice") ?? ""));
    return $v !== "" ? $v : EGO_BRAND_VOICE_DEFAULT;
}

/**
 * Brand style guide for GENERATED IMAGES (campaign headers, social). Keeps every
 * image on-brand: real UK maintenance settings, the ember/charcoal palette, and the
 * hard rules image models need (no text/logos — they render letters as gibberish).
 * Owner can override via Settings key `brand_image_style`.
 */
const EGO_BRAND_IMAGE_STYLE_DEFAULT = <<<'EGOIMG'
Create a photograph for EGO LTD, a UK property-maintenance company (homes and commercial) based in South-East London.
STYLE: photorealistic, premium editorial/documentary feel. Real UK settings — terraced houses, flats, small commercial units, kitchens, bathrooms, roofs, boilers. Real tradespeople in clean plain workwear or hi-vis, tidy tools, a clean unbranded work van where it fits. Natural daylight, crisp focus, shallow depth of field. Warm, grounded and trustworthy — never stocky, staged, cheesy or over-saturated.
COLOUR: warm amber/ember accents (like #EF9F27) against deep charcoal (#171816) and clean neutral backgrounds.
COMPOSITION: landscape banner, uncluttered, with clear negative space so a headline can be added later.
STRICT RULES: the image must contain NO text, NO words, NO letters, NO numbers, NO logos, NO watermarks and NO signage lettering (AI renders text as gibberish, so leave it out entirely). No distorted hands or faces, no clutter, no gore.
EGOIMG;

/** The editable brand image-style guide (Settings override, else the built-in default). */
function ego_brand_image_style(mysqli $db): string {
    $v = trim((string) (integ($db, "brand_image_style") ?? ""));
    return $v !== "" ? $v : EGO_BRAND_IMAGE_STYLE_DEFAULT;
}

/**
 * Build a full system prompt: the brand voice plus a task-specific instruction.
 * Pass the per-surface instruction (e.g. "Write a short internal task description").
 */
function ego_brand_system(mysqli $db, string $task): string {
    return ego_brand_voice($db) . "\n\nTASK: " . trim($task);
}
