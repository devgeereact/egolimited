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
  "cors_origins" => [
    "http://localhost:5051",
    "http://localhost:5050",
  ],
];
