<?php
/**
 * EGO LIMITED — invoicing core (single source of truth). Totals/VAT + the
 * transactional, gap-free document numbering. Mirrored in app/src/lib/invoicing.ts.
 */
declare(strict_types=1);

/** Compute line totals + subtotal + VAT + grand total. Money rounded to 2dp. */
function compute_totals(array $lines, float $vatRate): array {
    $subtotal = 0.0;
    $out = [];
    foreach ($lines as $l) {
        $qty = round((float)($l["quantity"] ?? 0), 2);
        $price = round((float)($l["unit_price"] ?? 0), 2);
        $lineTotal = round($qty * $price, 2);
        $subtotal += $lineTotal;
        $out[] = [
            "description" => trim((string)($l["description"] ?? "")),
            "quantity" => $qty,
            "unit_price" => $price,
            "line_total" => $lineTotal,
        ];
    }
    $subtotal = round($subtotal, 2);
    $vat = round($subtotal * $vatRate / 100, 2);
    return ["subtotal" => $subtotal, "vat_amount" => $vat, "total" => round($subtotal + $vat, 2), "lines" => $out];
}

/**
 * Build a 6-char alphanumeric customer code from name + phone + postcode:
 *   1 letter from name · 2 from postcode · 3 digits from phone (padded).
 * Deterministic; uniqueness handled by ensure_customer_code().
 */
function customer_code(string $name, ?string $phone, ?string $postcode): string {
    $alpha = preg_replace("/[^A-Z]/", "", strtoupper($name));
    $pc = preg_replace("/[^A-Z0-9]/", "", strtoupper($postcode ?? ""));
    $ph = preg_replace("/[^0-9]/", "", $phone ?? "");
    $code = substr($alpha . "X", 0, 1)
          . substr($pc . "XX", 0, 2)
          . substr(str_pad(substr($ph, -3), 3, "0", STR_PAD_LEFT), 0, 3);
    return strtoupper(substr($code . "XXXXXX", 0, 6));
}

/** Ensure a customer has a unique ref_code; generate + persist if missing. Returns the code. */
function ensure_customer_code(mysqli $db, int $customerId): string {
    $c = db_one($db, "SELECT name,phone,ref_code FROM ego_customers WHERE id=?", "i", $customerId);
    if (!$c) throw new RuntimeException("Customer not found");
    if (!empty($c["ref_code"])) return $c["ref_code"];
    $addr = db_one($db, "SELECT postcode FROM ego_addresses WHERE customer_id=? ORDER BY is_primary DESC, id LIMIT 1", "i", $customerId);
    $base = customer_code($c["name"], $c["phone"], $addr["postcode"] ?? null);
    $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    $code = $base; $i = 0;
    while (db_one($db, "SELECT id FROM ego_customers WHERE ref_code=?", "s", $code)) {
        $i++;
        $code = ($i <= 36) ? substr($base, 0, 5) . $alphabet[$i % 36]
                           : substr($base, 0, 4) . str_pad((string)$i, 2, "0", STR_PAD_LEFT);
        if ($i > 200) { $code = substr($base, 0, 2) . substr((string)$customerId, -4); break; }
    }
    db_exec($db, "UPDATE ego_customers SET ref_code=? WHERE id=?", "si", $code, $customerId);
    return $code;
}

/** Next per-customer JOB reference: CODE-J#. Call inside the job-create transaction. */
function next_job_reference(mysqli $db, int $customerId): string {
    $code = ensure_customer_code($db, $customerId);
    $n = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE customer_id=?", "i", $customerId)["c"] ?? 0) + 1;
    return "$code-J$n";
}

/**
 * Allocate the next per-customer document number: CODE-Q# (quote) / CODE-I# (invoice).
 * MUST run inside a transaction (locks the customer row = no dupes).
 */
function allocate_doc_number(mysqli $db, string $kind, int $customerId): string {
    db_one($db, "SELECT id FROM ego_customers WHERE id=? FOR UPDATE", "i", $customerId); // serialise
    $code = ensure_customer_code($db, $customerId);
    $letter = $kind === "quote" ? "Q" : "I";
    $n = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_invoices WHERE customer_id=? AND kind=? AND number IS NOT NULL", "is", $customerId, $kind)["c"] ?? 0) + 1;
    return "$code-$letter$n";
}
