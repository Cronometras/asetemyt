# Astro7 security upgrade — isolated validation

Keep the existing Cloudflare Pages project, domains, encrypted secrets, D1 binding and rollback history. Do not migrate or export production credentials. The current official Cloudflare adapter no longer supports Pages; use the documented Astro adapter entrypoint API and the standard Pages advanced-mode Fetch handler.

The adapter must preserve request bodies, cookies, response headers, client address, per-request runtime locals, static assets and prerendered pages. Existing authentication, Stripe fulfillment and D1 application logic remain unchanged. Preserve Tailwind3 through its existing PostCSS integration rather than changing the site's styles.

Validate compilation, existing admin/session/database/comparison regressions, adapter boundary tests, local preview GET routes, static HTML/CSS and a Pages preview before replacing production. No real email submissions, payments or customer records as tests. Production remains on the current deployment until every gate passes.

Validation completed: see astro7-pages-validation.json. The isolated preview revealed cross-release HTML cache reuse; release fingerprint and hostname scoping now prevent that regression.
