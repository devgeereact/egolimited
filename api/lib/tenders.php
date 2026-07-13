<?php
/**
 * EGO LIMITED — Contracts Finder feed.
 *
 * WHY THIS EXISTS. Every other way EGO finds work is push: we email a stranger and hope. This is
 * pull — public bodies publishing, by law, the work they need doing. Councils, schools, housing
 * associations and NHS trusts put responsive repairs, planned maintenance, voids, roofing and
 * decorating out to tender every week, and the notices are free, structured and open.
 *
 * WHY IT IS NOT SCRAPING. This reads the official Contracts Finder OCDS API over HTTPS. No login,
 * no ToS to breach, no personal data: a buyer's procurement contact is published expressly so that
 * suppliers can use it. That distinction is the whole reason this feature is buildable and
 * LinkedIn harvesting is not — and it is why a tender lead can be acted on without a GDPR argument.
 *
 * WHAT IT DOES NOT DO. It does not bid, does not email, does not decide. It finds notices that
 * plausibly match and puts them in front of a human, ordered by the only thing that matters: how
 * long is left to respond. A missed deadline is a lost job, and no cron can write a bid.
 */
declare(strict_types=1);

const TENDER_API = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";

/**
 * CPV is the EU procurement taxonomy every notice is tagged with. Prefix-matching it is far more
 * reliable than keywords, because the buyer picks the code — we are reading their classification,
 * not guessing from their prose.
 *
 *   45      construction work (refurb, roofing, glazing, painting, building completion)
 *   50      repair and maintenance services (the core of the business)
 *   7731    grounds maintenance
 *   79993   building and facilities management
 *   90911   cleaning services
 */
const TENDER_CPV_DEFAULT = "45,50,7731,79993,90911";

/**
 * Keywords are matched against the TITLE ONLY, deliberately. Descriptions routinely list every
 * trade on the site — the fixture that drove this rule is a landscaping tender whose description
 * happens to say "Ground Maintenance", which would drag in half the register. A buyer who wants
 * maintenance says so in the title.
 */
const TENDER_KEYWORDS_DEFAULT = "maintenance,repair,repairs,refurbishment,refurb,decorating,painting,"
    . "plumbing,electrical,roofing,handyperson,handyman,voids,void property,responsive,planned works,"
    . "fabric,fit-out,joinery,glazing,damp,gutter,drainage,boiler,heating,facilities management,"
    . "groundwork,landscaping,cleaning,building works,property services";

/** Founder-editable in Settings -> Integrations. Blank means "use the defaults above". */
function tender_prefs(mysqli $db): array {
    $cpv = trim((string) (integ($db, "tenders_cpv") ?? "")) ?: TENDER_CPV_DEFAULT;
    $kw  = trim((string) (integ($db, "tenders_keywords") ?? "")) ?: TENDER_KEYWORDS_DEFAULT;
    $pc  = trim((string) (integ($db, "tenders_postcodes") ?? ""));
    $split = static fn(string $s): array => array_values(array_filter(array_map(
        static fn($x) => strtolower(trim((string) $x)), explode(",", $s)
    ), static fn($x) => $x !== ""));
    return ["cpv" => $split($cpv), "keywords" => $split($kw), "postcodes" => $split($pc)];
}

/**
 * PURE. Flatten an OCDS release into the row we store. No DB, no clock, no network — so the real
 * payload can be replayed in a test, which is how the notice-URL bug below was caught.
 */
function tender_parse(array $rel): array {
    $t = $rel["tender"] ?? [];

    // The canonical notice URL is published in documents[], and ONLY there. Building it from
    // tender.id looks obvious and returns 403 — tender.id is not the notice id. Verified against
    // the live service before this line was written.
    $url = null;
    foreach ((array) ($t["documents"] ?? []) as $d) {
        if (($d["documentType"] ?? "") === "tenderNotice" && !empty($d["url"])) { $url = (string) $d["url"]; break; }
    }

    // Take the first real UK postcode we can find. Delivery addresses are a grab-bag: a notice
    // routinely lists "United Kingdom", "Europe" and "Rest of the World" alongside the one address
    // that matters, so a country name is worthless for deciding whether we can send a van.
    $postcode = null; $region = null;
    foreach ((array) ($t["items"] ?? []) as $item) {
        foreach ((array) ($item["deliveryAddresses"] ?? []) as $a) {
            if ($postcode === null && !empty($a["postalCode"])) $postcode = strtoupper(trim((string) $a["postalCode"]));
            if ($region === null && !empty($a["region"]))       $region = (string) $a["region"];
            if ($region === null && !empty($a["locality"]))     $region = (string) $a["locality"];
        }
    }

    $cpv = $t["classification"]["id"] ?? null;
    $extra = [];
    foreach ((array) ($t["additionalClassifications"] ?? []) as $c) {
        if (($c["scheme"] ?? "") === "CPV" && !empty($c["id"])) $extra[] = (string) $c["id"];
    }

    $dl = $t["tenderPeriod"]["endDate"] ?? null;
    $pub = $t["datePublished"] ?? ($rel["date"] ?? null);
    $iso = static fn(?string $s): ?string => $s ? date("Y-m-d H:i:s", strtotime($s)) : null;

    return [
        "ocid"        => (string) ($rel["ocid"] ?? ""),
        "title"       => trim((string) ($t["title"] ?? "")),
        "description" => trim((string) ($t["description"] ?? "")),
        "buyer"       => $rel["buyer"]["name"] ?? null,
        "buyer_email" => tender_buyer_email($rel),
        "cpv"         => $cpv !== null ? (string) $cpv : null,
        "cpv_all"     => array_values(array_unique(array_filter(array_merge([$cpv], $extra)))),
        "cpv_label"   => $t["classification"]["description"] ?? null,
        "value"       => isset($t["value"]["amount"]) ? (float) $t["value"]["amount"] : null,
        "currency"    => $t["value"]["currency"] ?? null,
        "postcode"    => $postcode,
        "region"      => $region,
        "sme"         => !empty($t["suitability"]["sme"]),
        "category"    => $t["mainProcurementCategory"] ?? null,
        "published_at" => $iso($pub),
        "deadline_at"  => $iso($dl),
        "url"         => $url,
    ];
}

/** The buyer's PUBLISHED procurement contact — the address they print so suppliers can reach them. */
function tender_buyer_email(array $rel): ?string {
    $buyerId = $rel["buyer"]["id"] ?? null;
    foreach ((array) ($rel["parties"] ?? []) as $p) {
        if ($buyerId !== null && ($p["id"] ?? null) !== $buyerId) continue;
        $e = $p["contactPoint"]["email"] ?? null;
        if ($e && filter_var($e, FILTER_VALIDATE_EMAIL)) return strtolower(trim((string) $e));
    }
    return null;
}

/**
 * PURE. Does this notice look like work EGO can do? Returns the reason it matched, or null.
 *
 * Returning the REASON, not a boolean, is the point. A human triaging fifty notices needs to know
 * in one glance why each one is in front of them; "CPV 50700000 — Repair and maintenance of
 * building installations" is a decision, "matched" is a shrug.
 */
function tender_match(array $row, array $prefs): ?string {
    // A notice we cannot respond to is not an opportunity. Closed is closed.
    foreach ($prefs["cpv"] as $prefix) {
        foreach ($row["cpv_all"] as $code) {
            if (str_starts_with((string) $code, $prefix)) {
                $label = $row["cpv_label"] ? " — " . $row["cpv_label"] : "";
                return "CPV $code$label";
            }
        }
    }
    $title = strtolower($row["title"]);
    foreach ($prefs["keywords"] as $kw) {
        if ($kw !== "" && str_contains($title, $kw)) return "Title mentions \"$kw\"";
    }
    return null;
}

/**
 * PURE. Can we actually service it? Only excludes when we KNOW the answer is no.
 *
 * If the buyer published no postcode we keep the notice: an unknown location is not a wrong one,
 * and silently dropping work because a form field was blank is how a feed loses its credibility.
 */
function tender_in_area(array $row, array $prefs): bool {
    if (!$prefs["postcodes"]) return true;            // no filter set — the whole UK
    if (!$row["postcode"]) return true;               // unknown, so let a human look
    $pc = strtolower((string) $row["postcode"]);
    foreach ($prefs["postcodes"] as $p) {
        if (str_starts_with($pc, $p)) return true;
    }
    return false;
}

function ensure_tenders_table(mysqli $db): void {
    $db->query("CREATE TABLE IF NOT EXISTS ego_tenders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ocid VARCHAR(120) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NULL,
        buyer VARCHAR(255) NULL,
        buyer_email VARCHAR(190) NULL,
        cpv VARCHAR(24) NULL,
        cpv_label VARCHAR(255) NULL,
        value_amount DECIMAL(14,2) NULL,
        currency VARCHAR(8) NULL,
        postcode VARCHAR(16) NULL,
        region VARCHAR(190) NULL,
        sme TINYINT(1) NOT NULL DEFAULT 0,
        category VARCHAR(40) NULL,
        match_reason VARCHAR(255) NULL,
        url VARCHAR(500) NULL,
        published_at DATETIME NULL,
        deadline_at DATETIME NULL,
        status ENUM('new','shortlisted','rejected','bid','won','lost') NOT NULL DEFAULT 'new',
        customer_id INT NULL,
        decided_by INT NULL,
        decided_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tender_ocid (ocid),
        INDEX idx_tender_status (status),
        INDEX idx_tender_deadline (deadline_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/** One page of the OCDS search. Returns [releases, nextUrl]. */
function tender_fetch(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => ["Accept: application/json"],
        CURLOPT_USERAGENT => "EGO-LIMITED-tender-feed/1.0 (+https://egolimited.com)",
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    if ($body === false || $code !== 200) {
        throw new RuntimeException("Contracts Finder returned HTTP $code" . ($err ? " ($err)" : ""));
    }
    $json = json_decode((string) $body, true);
    if (!is_array($json) || !isset($json["releases"])) throw new RuntimeException("Contracts Finder sent an unreadable response");
    return [(array) $json["releases"], $json["links"]["next"] ?? null];
}

/**
 * Pull notices published in the last $days and store the ones that match.
 *
 * Idempotent by ocid: re-running never duplicates, and never resets a decision a human has already
 * made. That matters because the cron overlaps its window on purpose — a notice published while a
 * run was in flight would otherwise be missed forever, and there is no second chance on a tender.
 */
function tender_sync(mysqli $db, int $days = 2, int $maxPages = 20): array {
    ensure_tenders_table($db);
    $prefs = tender_prefs($db);

    $from = gmdate("Y-m-d\TH:i:s\Z", strtotime("-$days days"));
    $to   = gmdate("Y-m-d\TH:i:s\Z");
    $url  = TENDER_API . "?" . http_build_query(["publishedFrom" => $from, "publishedTo" => $to, "stages" => "tender"]);

    $seen = 0; $matched = 0; $added = 0; $pages = 0;
    while ($url !== null && $pages < $maxPages) {
        [$releases, $url] = tender_fetch($url);
        $pages++;
        if (!$releases) break;
        foreach ($releases as $rel) {
            $seen++;
            $row = tender_parse((array) $rel);
            if ($row["ocid"] === "" || $row["title"] === "") continue;

            // Already closed by the time we saw it. Storing it would put a dead deadline at the top
            // of a list sorted by urgency, which is the one thing the list must never do.
            if ($row["deadline_at"] !== null && strtotime($row["deadline_at"]) < time()) continue;

            $reason = tender_match($row, $prefs);
            if ($reason === null || !tender_in_area($row, $prefs)) continue;
            $matched++;

            // INSERT IGNORE, not REPLACE: a human's status, owner and notes on an existing row are
            // worth more than a fresher copy of a title that has not changed.
            $st = db_exec($db,
                "INSERT IGNORE INTO ego_tenders
                 (ocid,title,description,buyer,buyer_email,cpv,cpv_label,value_amount,currency,
                  postcode,region,sme,category,match_reason,url,published_at,deadline_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                "sssssssdsssisssss",
                $row["ocid"], $row["title"], $row["description"], $row["buyer"], $row["buyer_email"],
                $row["cpv"], $row["cpv_label"], $row["value"], $row["currency"],
                $row["postcode"], $row["region"], $row["sme"] ? 1 : 0, $row["category"],
                $reason, $row["url"], $row["published_at"], $row["deadline_at"]
            );
            if ($st->affected_rows > 0) $added++;
        }
    }
    return ["seen" => $seen, "matched" => $matched, "added" => $added, "pages" => $pages];
}
