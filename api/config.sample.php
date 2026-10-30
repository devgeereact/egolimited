<?php
/**
 * EGO LIMITED API config — TEMPLATE.
 * Copy to config.php (gitignored, never deployed from repo) and fill real values.
 * Dedicated DB: devgeereact_egolimited (ego_ prefixed tables).
 */
return [
  "db_host"   => "localhost",
  "db_name"   => "devgeereact_egolimited",
  "db_user"   => "__SET_DB_USER__",
  "db_pass"   => "__SET_DB_PASS__",
  // Allowed CORS origins (local dev surfaces). Live is same-origin.
  // Clerk sign-in (email code). Issuer = the Clerk Frontend API URL of the PRODUCTION instance
  // (https://clerk.egolimited.com), no trailing slash. Authorised parties = the exact origins that
  // may present a token: the live site and local-live. Nothing else.
  "clerk_issuer" => "https://clerk.example.com",
  "clerk_authorized_parties" => ["https://egolimited.com", "https://local.egolimited.com"],
  // Optional: a private writable folder outside the web root for the cached signing keys.
  // "clerk_cache_dir" => "/home/USER/ego_private/cache",
  // Optional: separate user with ALTER/INDEX rights, used only by migrate_sql.php.
  // "migrate_db_user" => "", "migrate_db_pass" => "",
  "cors_origins" => [
    "http://localhost:5051",
    "http://localhost:5050",
  ],
];
