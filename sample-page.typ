// ─────────────────────────────────────────────────────────────────
//  The Home Bartender — Recipe Page Template
//  Sample: Naked & Famous
//  Page size: 5.5 × 8.5 in (digest / trade paperback)
// ─────────────────────────────────────────────────────────────────

#set page(
  width: 5.5in,
  height: 8.5in,
  margin: (x: 0.75in, y: 0.85in),
  numbering: "1",
  number-align: center,
)

#set text(
  font: "Linux Libertine",
  size: 10.5pt,
  fill: rgb("#1a1a1a"),
)

#set par(leading: 0.65em, justify: false)
#set list(indent: 0pt)
#set enum(indent: 0pt)

// ── Color Palette ─────────────────────────────────────────────────
#let accent    = rgb("#2c4a3e")   // deep botanical green
#let soft      = rgb("#f5f0e8")   // warm cream
#let muted     = rgb("#8c7b6b")   // warm gray-brown
#let rule-col  = rgb("#ddd8cf")   // divider line

// ── Reusable Components ───────────────────────────────────────────

// Section header label
#let sh(body) = {
  v(0.75em)
  text(size: 8pt, weight: "bold", tracking: 2pt, fill: accent)[#upper(body)]
  v(0.3em)
}

// Horizontal rule
#let divider = {
  v(0.5em)
  line(length: 100%, stroke: 0.4pt + rule-col)
}

// Flavor tag pill
#let tag(label) = box(
  fill: soft,
  stroke: 0.5pt + rule-col,
  inset: (x: 7pt, y: 3.5pt),
  radius: 2pt,
)[#text(size: 7.5pt, fill: muted, tracking: 0.8pt)[#upper(label)]]


// ═════════════════════════════════════════════════════════════════
//  RECIPE CONTENT — Naked & Famous
// ═════════════════════════════════════════════════════════════════

// ── Title & Tagline ───────────────────────────────────────────────
#align(center)[
  #v(0.3em)
  #text(size: 30pt, weight: "bold", fill: accent)[Naked & Famous]
  #v(0.3em)
  #text(size: 11pt, style: "italic", fill: muted)[
    An equal-parts mezcal sour — smoky, bitter, herbal, and bright all at once.
  ]
  #v(0.65em)
]

// ── Metadata Bar ──────────────────────────────────────────────────
#block(
  width: 100%,
  fill: accent,
  inset: (x: 14pt, y: 9pt),
  radius: 3pt,
)[
  #set text(fill: white, size: 9pt, font: "Linux Libertine")
  #grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 0pt,
    align: center,
    [*GLASS*#linebreak()Coupe],
    [*METHOD*#linebreak()Shaken],
    [*ICE*#linebreak()None · up],
    [*DIFFICULTY*#linebreak()Easy],
  )
]

// ── Flavor Tags ───────────────────────────────────────────────────
#v(0.7em)
#tag("Smoky") #h(4pt)
#tag("Bitter") #h(4pt)
#tag("Herbal") #h(4pt)
#tag("Citrus")

#divider

// ── Ingredients ───────────────────────────────────────────────────
#sh[Ingredients]

#grid(
  columns: (0.85in, 1fr),
  row-gutter: 5.5pt,
  [¾ oz], [Mezcal],
  [¾ oz], [Yellow Chartreuse],
  [¾ oz], [Aperol],
  [¾ oz], [Fresh lime juice],
)

#divider

// ── Method ────────────────────────────────────────────────────────
#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until thoroughly chilled.
+ Double-strain into a chilled coupe.

#divider

// ── Batch ─────────────────────────────────────────────────────────
#sh[Batch · 8 Servings]

#grid(
  columns: (0.85in, 1fr),
  row-gutter: 5.5pt,
  [6 oz], [Mezcal],
  [6 oz], [Yellow Chartreuse],
  [6 oz], [Aperol],
  [6 oz], [Fresh lime juice],
)

#v(0.5em)
#text(style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and double-strain to serve.
]

#divider

// ── Notes ─────────────────────────────────────────────────────────
#sh[Notes]

Created by Joaquín Simó at Death & Co, NYC. An equal-parts cocktail — the easiest format to remember and scale. Yellow Chartreuse is essential; Green Chartreuse is too herbal and overpowers the balance.

#v(0.55em)
#block(
  fill: soft,
  stroke: (left: 2.5pt + accent, rest: none),
  inset: (left: 12pt, right: 10pt, y: 9pt),
  width: 100%,
)[
  #text(size: 9.5pt)[
    *Substitute:* Yellow Chartreuse can be hard to find and expensive.
    *Strega* — a saffron-forward Italian herbal liqueur — works well in its place,
    with a similar herbal sweetness and golden character.
  ]
]

#divider

// ── Neighbors ─────────────────────────────────────────────────────
#sh[If You Like This, Try]

#grid(
  columns: (1.55in, 1fr),
  row-gutter: 7pt,
  [*Oaxaca Old Fashioned*],
  [Same mezcal smokiness, but stirred and spirit-forward.],
  [*Penicillin*],
  [Modern classic — smoky scotch, bright citrus, perfect balance.],
)
