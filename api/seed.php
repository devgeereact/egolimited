<?php
/**
 * EGO LIMITED — one-off setup: create ego_ tables + seed users.
 * Run on the server (CLI):  php seed.php   (mysqli — host has no pdo_mysql)
 * Idempotent: safe to run more than once.
 */
declare(strict_types=1);
$cfg = require __DIR__ . "/config.php";

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");

// 1) schema — strip -- comments first (they may contain ';'), then split
$sql = file_get_contents(__DIR__ . "/schema.sql");
$sql = preg_replace('/^\s*--.*$/m', "", $sql);
foreach (array_filter(array_map("trim", explode(";", $sql))) as $stmt) {
    if ($stmt !== "") $db->query($stmt);
}
echo "schema ok\n";

// 2) seed users (upsert by email)
$users = [
    ["Founder",       "admin@egolimited.co.uk",   "founder",  "Admin123!",    "+44 7700 900000"],
    ["Maria Manager", "manager@egolimited.co.uk", "manager",  "Manager123!",  "+44 7700 900333"],
    ["Olivia Office", "office@egolimited.co.uk",  "office",   "Office123!",   "+44 7700 900444"],
    ["Tom Baker",     "tom@egolimited.co.uk",     "engineer", "Engineer123!", "+44 7700 900111"],
    ["Sarah Coleman", "sarah@egolimited.co.uk",   "engineer", "Engineer123!", "+44 7700 900222"],
];
foreach ($users as [$name, $email, $role, $pass, $phone]) {
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $st = $db->prepare("SELECT id FROM ego_users WHERE email = ?");
    $st->bind_param("s", $email); $st->execute();
    $row = $st->get_result()->fetch_assoc();
    if ($row) {
        $u = $db->prepare("UPDATE ego_users SET name=?, password_hash=?, role=?, active=1, phone=?, deleted_at=NULL, invite_token=NULL WHERE id=?");
        $u->bind_param("ssssi", $name, $hash, $role, $phone, $row["id"]); $u->execute();
        echo "updated $email\n";
    } else {
        $i = $db->prepare("INSERT INTO ego_users (name,email,password_hash,role,active,phone) VALUES (?,?,?,?,1,?)");
        $i->bind_param("sssss", $name, $email, $hash, $role, $phone); $i->execute();
        echo "created $email\n";
    }
}
// 3) company settings (single row)
$has = $db->query("SELECT COUNT(*) c FROM ego_company_settings")->fetch_assoc()["c"];
if (!$has) {
    $db->query("INSERT INTO ego_company_settings
        (company_name,address,phone,email,vat_number,default_vat_rate,
         bank_account_name,bank_sort_code,bank_account_number,
         invoice_prefix,invoice_next_number,job_prefix,job_next_number,payment_terms_days)
        VALUES
        ('EGO LIMITED','Unit 4, Trade Park, Birmingham B6 7EU','+44 121 000 0000','office@egolimited.co.uk',
         'GB123456789',20.00,'EGO LIMITED','04-00-04','12345678','INV-',1,'JOB-',1,14)");
    echo "company_settings created\n";
} else { echo "company_settings exists\n"; }

// 4) sample customers (+ primary address) — upsert by email
function ego_customer(mysqli $db, string $name, string $phone, string $email, string $line1, string $city, string $pc): int {
    $st = $db->prepare("SELECT id FROM ego_customers WHERE email=?"); $st->bind_param("s", $email); $st->execute();
    $row = $st->get_result()->fetch_assoc();
    if ($row) return (int)$row["id"];
    $i = $db->prepare("INSERT INTO ego_customers (name,phone,email) VALUES (?,?,?)");
    $i->bind_param("sss", $name, $phone, $email); $i->execute();
    $cid = (int)$db->insert_id;
    $a = $db->prepare("INSERT INTO ego_addresses (customer_id,line1,city,postcode,is_primary) VALUES (?,?,?,?,1)");
    $a->bind_param("isss", $cid, $line1, $city, $pc); $a->execute();
    return $cid;
}
$c1 = ego_customer($db, "Margaret Hughes", "+44 7700 900123", "m.hughes@example.co.uk", "14 Oakfield Road", "Birmingham", "B15 3JQ");
$c2 = ego_customer($db, "David Okafor",    "+44 7700 900456", "david.okafor@example.com", "7 Maple Court", "Solihull", "B91 2AB");
$c3 = ego_customer($db, "Priya Sharma",    "+44 7700 900789", "priya.s@example.co.uk", "22 Elm Grove", "Coventry", "CV1 5RW");
echo "customers seeded\n";

// 5) sample jobs — only if none exist (keeps references stable)
$jobCount = $db->query("SELECT COUNT(*) c FROM ego_jobs")->fetch_assoc()["c"];
if (!$jobCount) {
    $tom = $db->query("SELECT id FROM ego_users WHERE email='tom@egolimited.co.uk'")->fetch_assoc()["id"];
    $jobs = [
        ["JOB-0001", $c1, $tom, "Boiler not firing — no hot water", "Worcester combi locking out (E133).", "urgent", "scheduled"],
        ["JOB-0002", $c2, $tom, "Kitchen tap leaking under sink", "Slow leak from isolation valve.", "normal", "completed"],
        ["JOB-0003", $c3, null, "Annual gas safety check (CP12)", "Landlord certificate, 1 boiler + hob.", "low", "new"],
    ];
    $j = $db->prepare("INSERT INTO ego_jobs (reference,customer_id,engineer_id,title,description,priority,status,quoted_amount) VALUES (?,?,?,?,?,?,?,?)");
    foreach ($jobs as [$ref, $cid, $eng, $title, $desc, $prio, $status]) {
        $amt = 120.00;
        $j->bind_param("siissssd", $ref, $cid, $eng, $title, $desc, $prio, $status, $amt);
        $j->execute();
        $jid = (int)$db->insert_id;
        $db->query("INSERT INTO ego_activity_log (job_id,action,detail) VALUES ($jid,'created','{\"seed\":true}')");
    }
    $db->query("UPDATE ego_company_settings SET job_next_number=4");
    echo "jobs seeded (JOB-0001..0003)\n";
} else { echo "jobs exist ($jobCount)\n"; }

echo "done. seed logins:\n";
echo "  admin@egolimited.co.uk / Admin123!  (admin)\n";
echo "  tom@egolimited.co.uk / Engineer123!  (engineer)\n";
echo "  sarah@egolimited.co.uk / Engineer123!  (engineer)\n";
