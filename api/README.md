# api/ — EGO LIMITED backend

PHP + MySQL backend endpoints for the EGO LIMITED app, deployed to `public_html/egolimited/api/`
on cPanel (the SoulRefresh backend pattern — see root `api.php` / `config.php`).

**Backend decided: cPanel PHP + MySQL.** Not built yet. The kickoff/developer prompt builds the data
layer mirroring `../docs/03-DATA-MODEL.md` (translated Postgres → MySQL) plus PHP endpoints and
session/token auth. Core logic to centralise (one module each): job status state machine, invoice
numbering/totals/VAT, customer access tokens.

Dev port: **8011**. Secrets live server-side in `config.php` (gitignored, never deployed/committed).
