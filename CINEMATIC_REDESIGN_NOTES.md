# PlayCrows Cinematic Redesign

Updated files:
- `src/App.tsx`
- `src/index.css`
- `src/components/LanguageSelector.tsx`

## What changed
- Added a full-screen cinematic landing page inspired by premium game campaign microsites.
- Uses the existing `public/images/playcrows-hero-bg.jpg` artwork from this project.
- Added PlayCrows branding, server-rate highlights, game-style navigation, animated embers, and a Web Shop CTA.
- The Web Shop now appears below the hero in a dark red/copper fantasy panel.
- Existing package selection, cumulative rewards, payment flow, receipt upload, submission logic, Supabase integration, and translations were preserved.
- Added desktop/tablet/mobile responsive behavior.

## Deployment
Install dependencies and build normally:

```bash
npm install
npm run build
```

Then deploy to Vercel as before.

## Validation note
The source was structurally reviewed in the editing environment. A full Vite build could not be run here because the available internal npm registry did not contain `@supabase/supabase-js`. This is an environment/package-registry limitation; the project dependency itself was not changed.
