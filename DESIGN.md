# Gusto's Guide design system

One look, one set of sizes. If two things are the same kind of element, they are the same size and they share an edge.

The brand does not change: cream paper, navy, coral, Liquid Glass, spring motion, the Golden Fork, and the gray Yelp line. This file is how those pieces line up.

## Principles

1. **Same thing, same size.** A score badge is always `--badge-w` by `--badge-h`. A chip is always `--chip-h`. An icon button is always `--hit`. A tag is always `--tag-h`. A rank pip is always `--index`. Do not let the label decide the box.
2. **Same anchor.** In a vertical list, every repeated box shares one x position. Top-align the box with the first line of the name. Single-line text in that row shares a baseline (`.score-line`).
3. **Trailing column.** Scores, counts, and row actions sit in a fixed column on the right. The text column is `minmax(0, 1fr)` and may wrap or truncate. The column does not.
4. **One padding per role.** Page inset is `--page-pad` (16px). Cards are `--card-pad` (16px). Dense rows (explore, search, plan picks) are `--row-pad` (8px). Do not invent 6px, 10px, or 14px.
5. **Equal gutters.** Stacks of cards use `--gutter` (12px). Chip rows and button grids use `--space-2` (8px).
6. **8px space scale.** `4, 8, 12, 16, 24, 32, 48, 64`. 4px is only inside a control (a border, a hairline). Layout uses 8 and up.
7. **Tabular numerals** on every score, count, rank, and vote.

## Color roles

| Token | Value | Use |
| --- | --- | --- |
| `--color-cream` | `#eee3d6` | Page background |
| `--color-card` | `#fffaf3` | Cards, inputs, default buttons |
| `--color-navy` | `#141f4d` | Header on the hero, selected chips, map ink |
| `--color-coral` | `#ff5330` | Primary action, count stamps, rank pips |
| `--color-leaf` | `#38ba46` | "Been", high scores |
| `--color-ink` | `#181818` | Text and borders |
| `--color-muted` | `#3f3832` | Secondary text |
| `--color-ref` | `#4a453f` | The Yelp line only (`.public-ref`) |
| `--color-muted-bg` | `#e4ddd2` | Unrated badge fill |

Yelp is the only outside rating. It stays a small gray line. No Tripadvisor, Foursquare, OpenTable, or Apple Maps rating.

## Type

Instrument Serif italic for names and titles. Instrument Sans for everything else.

| Token | Size | Use |
| --- | --- | --- |
| `--text-xs` | 12px | Meta, tags, sort chips |
| `--text-sm` | 14px | Buttons, body secondary |
| `--text-md` | 16px | Body |
| `--text-lg` | 18px | Lead |
| `--text-xl` | 20px | Card names on dense rows |
| `--text-2xl` | 24px | Row names |
| `--text-3xl` | 30px | Section titles |
| `--text-4xl` | 36px | Page sections |
| `--text-5xl` | 48px | Page titles |
| `--text-6xl` | 60px | Hero |

## Space, radius, elevation

Space tokens live on `html` in `src/index.css`.

| Token | Value |
| --- | --- |
| `--radius-sm` | 12px badges and inputs |
| `--radius-md` | 20px cards |
| `--radius-lg` | 28px hero, map, sheets |
| `--radius-pill` | chips, tags, icon buttons |

Glass levels:

- **Resting** (`--elev-1`): cards and rows. Soft navy shadow, no blur required.
- **Raised** (`--elev-2`): hover and the bell.
- **Glass** (`--glass-fill`, `--glass-edge`, `--glass-sheen`): header, menus, sheets. Blur where the browser allows it; the solid cream fallback stays.

Springs stay at stiffness about 420 and damping about 32. Reduced motion removes the travel.

## Controls

| Token | Value | Class |
| --- | --- | --- |
| `--control-h` / `--chip-h` / `--hit` | 44px | `.btn`, `.chip`, `.sort-chip`, `.sheet-icon` |
| `--tag-h` | 32px | `.tag` |
| `--icon-sm` / `--icon-md` / `--icon-lg` | 16 / 24 / 32px | glyphs inside controls, fork sm |
| `--index` / `--index-lg` | 32 / 48px | `.rank-pip`, `.entry-index` |
| `--badge-w` × `--badge-h` | 100 × 70px | `.score-badge-sm` |
| `--count-w` | 76px | `.guide-count` |
| `--shot` | 64px | `.place-row-shot` |
| `--score-num-w` | 48px | `.score-line-num` |

A button's width follows its grid cell, not its label. `.action-row` is `repeat(auto-fill, minmax(8.5rem, 1fr))` and every `.btn` inside it is `width: 100%`, so a short label and a long one occupy the same cell.

## Layout

**Page.** `px-4` (`--page-pad`). The header offset is `--header-offset`; do not hard-code a top pad that ignores a wrapped nav.

**Place row.** `.place-row` is `shot | text | badge`. The badge is `.score-col`, top-aligned. Names wrap inside the text column.

**Count row.** `.card-split` is `text | count`. The count is top-aligned. Short titles do not pull it left.

**Score line.** `.score-line` is `rank | name | number`, baseline-aligned, tabular figures.

**Cards.** Media is flush to the card edge. The body is `.card-body` or `.place-card-body` at `--card-pad`. A horizontal strip (`.toc-card`) uses `.toc-pad` (`--space-2`) because the card is 13rem wide.

## Do not

- Invent a Gusto's Score, a review, or a one-liner.
- Show any outside rating except the Yelp line.
- Recolor the Golden Fork tiers (gold with a pink gem, silver, bronze, navy and coral for 4–25).
- Add a dark theme. `color-scheme` stays light.
- Size a badge from the words "Best of the best" or "Not yet rated".
