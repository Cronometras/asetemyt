# Retire legacy direct client submissions — 2026-11-11

Three historical pending collections allowed anonymous direct document creation. The current web has no Firestore client writes: `/api/directorio/submit` explicitly requires D1 and creates the pending document server-side. Disable direct client creates on the old Firestore collections to prevent bypassing current form validation and daily limits. Keep existing public directory and published article reads; keep pending data private and untouched. IAM-authenticated maintenance scripts retain their existing server permissions.

Twenty-four official positive/negative rule checks pass; active source fetched and hash verified. No real submissions/emails/customer records as tests. Current D1 submission endpoint was not changed.
