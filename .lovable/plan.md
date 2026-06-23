## Plan: Publish SEO updates

Deploy the current build so the recent SEO fixes go live on https://hazorex.com.

### What goes live
- `public/robots.txt` — allow rules + disallowed private routes + sitemap reference
- `public/llms.txt` — site description and public page list for AI crawlers
- `src/routes/sitemap[.]xml.ts` — server route generating `/sitemap.xml` with all 13 public routes

### Steps
1. Preflight website info: verify root `head()` metadata (title, description, og:*, twitter:*, favicon) is still relevant to Origen/Hazorex; touch up only if stale.
2. Check `security--get_scan_results` for any unresolved critical findings before publishing.
3. Call `preview_ui--publish` to deploy. Site will be live ~1 minute after the call returns.
4. After publish, suggest the user click "Rescan" in the SEO & AI search tab to re-verify the fixed findings.

### Notes
- Frontend deploy required (these are public/ + route files), which is exactly what publish does.
- No code changes in this step — purely a deploy.