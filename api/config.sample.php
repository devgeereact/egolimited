<?php
/**
 * EGO LIMITED API config — TEMPLATE.
 * Copy to config.php on the server (gitignored, never deployed from repo).
 * Reuses the SoulRefresh MySQL DB with ego_ prefixed tables.
 */
return [
  "db_host"   => "localhost",
  "db_name"   => "devgeereact_soulrefresh",
  "db_user"   => "devgeereact_soulrefresh",
  "db_pass"   => "__SET_ON_SERVER__",
  // Allowed CORS origins (local dev surfaces). Live is same-origin.
  "cors_origins" => [
    "http://localhost:5012",
    "http://localhost:5011",
  ],
];
