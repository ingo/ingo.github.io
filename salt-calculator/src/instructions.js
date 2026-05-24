// User-facing instruction text. Keys "S", "T", "B" in meatData.json expand here.
// Phrasing rewritten in my own voice; longer per-meat instructions are kept
// in meatData.json verbatim for accuracy.

export const INSTRUCTIONS = {
  S: 'Salt anywhere from 40 minutes to 48 hours before you cook.',
  T: "Salt 40 minutes to 48 hours ahead. If you're going to pan-sear or grill, set it on a wire rack and leave it uncovered in the fridge — that dry surface is what gives you a real crust.",
  B: "The recommended salinity above is dialed in for burgers. If your recipe brings other salty ingredients, scale it down. With ground meat you aren't really dry-brining — leave salt in too long and the texture turns rubbery, so mix it in no more than 10 minutes before you cook.",
}

export function expandInstruction(value) {
  if (!value) return ''
  return INSTRUCTIONS[value] ?? value
}
