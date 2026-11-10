/**
 * Personal ratings shipped with the site. The house database wins when it
 * already has a score for the same place. These fill the gap until that write.
 */
export const HOUSE_SCORE_FALLBACK: Record<string, number> = {
  'pasta-casalinga': 8.0,
  'il-bistro': 7.4,
  'that-s-amore-italian-cafe': 7.3,
  'barolo-ristorante': 7.1,
  'cortina': 7.0,
  'due-cucina-italiana': 6.9,
  'mamma-melina-ristorante-pizzeria': 6.7,
}
