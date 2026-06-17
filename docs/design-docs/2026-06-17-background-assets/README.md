# Background Assets

Generated on 2026-06-17 for the system UI refresh.

These assets are subtle mobile page backgrounds intended to sit behind white/ivory cards and grouped surfaces. Each asset has an editable SVG source and a 1170x2532 PNG export suitable for high-density mobile screens.

## Assets

- `/backgrounds/bg-auth-botanical.png` — login/register page.
- `/backgrounds/bg-app-paper.png` — settings, plant board, and general authenticated pages.
- `/backgrounds/bg-task-morning.png` — today task and task-detail pages.
- `/backgrounds/bg-form-quiet.png` — create/edit plant and care-task forms.

## Usage

```css
.page {
  background-color: var(--color-paper);
  background-image: url("/backgrounds/bg-app-paper.png");
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
}
```

Use page-level overlays sparingly. These files are intentionally low contrast so content remains readable.
