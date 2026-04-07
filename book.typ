// ─────────────────────────────────────────────────────────────────
//  The Home Bartender — Full Book Draft
//  Page size: 5.5 × 8.5 in (digest / trade paperback)
// ─────────────────────────────────────────────────────────────────

#set page(
  width: 5.5in,
  height: 8.5in,
  margin: (x: 0.6in, y: 0.55in),
  numbering: "1",
  number-align: center,
)

#set text(
  font: "Libertinus Serif",
  size: 9pt,
  fill: rgb("#1a1a1a"),
)

#set par(leading: 0.5em, justify: false)
#set list(indent: 0pt, spacing: 0.4em)
#set enum(indent: 0pt, spacing: 0.4em)

// ── Color Palette ─────────────────────────────────────────────────
#let accent    = rgb("#2c4a3e")   // deep botanical green
#let soft      = rgb("#f5f0e8")   // warm cream
#let muted     = rgb("#8c7b6b")   // warm gray-brown
#let rule-col  = rgb("#ddd8cf")   // divider line

// ── Reusable Components ───────────────────────────────────────────

// Section header label
#let sh(body) = {
  v(0.3em)
  text(size: 7.5pt, weight: "bold", tracking: 2pt, fill: accent)[#upper(body)]
  v(0.15em)
}

// Horizontal rule
#let divider = {
  v(0.2em)
  line(length: 100%, stroke: 0.4pt + rule-col)
}

// Flavor tag pill
#let tag(label) = box(
  fill: soft,
  stroke: 0.5pt + rule-col,
  inset: (x: 7pt, y: 3.5pt),
  radius: 2pt,
)[#text(size: 7.5pt, fill: muted, tracking: 0.8pt)[#upper(label)]]

// Image placeholder box
#let image-placeholder(recipe-name, kind: "Photo") = {
  let slug = lower(recipe-name.replace(" ", "-").replace("&", "and").replace("'", ""))
  let kind-lower = lower(kind)
  v(0.5em)
  block(
    width: 100%,
    height: 2in,
    fill: soft,
    stroke: 1pt + rule-col,
    radius: 4pt,
    inset: 10pt,
  )[
    #align(center + horizon)[
      #text(size: 9pt, fill: muted)[
        #kind: #recipe-name \
        #text(size: 7.5pt)[\[ assets/#slug/#kind-lower\.jpg \]]
      ]
    ]
  ]
  v(0.5em)
}

// Chapter title page
#let chapter-title(title) = {
  pagebreak()
  v(2in)
  align(center)[
    #text(size: 11pt, weight: "bold", tracking: 3pt, fill: muted)[#upper(title)]
    #v(0.3em)
    #line(length: 2in, stroke: 0.6pt + accent)
  ]
  v(1in)
}

// Prose section header
#let section-heading(title) = {
  v(1em)
  text(size: 14pt, weight: "bold", fill: accent)[#title]
  v(0.5em)
}

// Sub-section header for prose
#let sub-heading(title) = {
  v(0.8em)
  text(size: 11pt, weight: "bold", fill: accent)[#title]
  v(0.3em)
}

// Recipe page — metadata bar
#let metadata-bar(glass, method, ice, difficulty) = {
  block(
    width: 100%,
    fill: accent,
    inset: (x: 14pt, y: 7pt),
    radius: 3pt,
  )[
    #set text(fill: white, size: 8pt)
    #grid(
      columns: (1fr, 1fr, 1fr, 1fr),
      gutter: 0pt,
      align: center,
      [*GLASS*#linebreak()#glass],
      [*METHOD*#linebreak()#method],
      [*ICE*#linebreak()#ice],
      [*DIFFICULTY*#linebreak()#difficulty],
    )
  ]
}

// Ingredients grid
#let ingredients(..items) = {
  let pairs = items.pos()
  grid(
    columns: (0.85in, 1fr),
    row-gutter: 4pt,
    ..pairs
  )
}

// Notes callout — compact inline
#let callout(body) = {
  v(0.2em)
  text(size: 8pt, fill: muted)[#body]
}


// ═══════════════════════════════════════════════════════════════════
//  TITLE PAGE
// ═══════════════════════════════════════════════════════════════════

#page(numbering: none)[
  #v(2.5in)
  #align(center)[
    #text(size: 36pt, weight: "bold", fill: accent)[The Home Bartender]
    #v(0.5em)
    #text(size: 13pt, style: "italic", fill: muted)[
      Recipes, Experiments & Notes from the Counter
    ]
    #v(2em)
    #text(size: 11pt, fill: muted)[Dan]
    #v(0.3em)
    #line(length: 1.5in, stroke: 0.5pt + rule-col)
    #v(0.3em)
    #text(size: 9pt, fill: muted)[DRAFT — April 2026]
  ]
]


// ═══════════════════════════════════════════════════════════════════
//  TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════

#page(numbering: none)[
  #v(0.5in)
  #align(center)[
    #text(size: 11pt, weight: "bold", tracking: 3pt, fill: muted)[#upper[Contents]]
    #v(0.3em)
    #line(length: 2in, stroke: 0.6pt + accent)
  ]
  #v(1em)

  #set text(size: 10pt)

  *Introduction* \
  *Tools* \
  *Techniques* \

  #v(0.5em)
  #text(size: 8pt, weight: "bold", tracking: 2pt, fill: accent)[#upper[Recipes]]
  #v(0.3em)

  Army & Navy \
  Bubbly Mojito \
  Chocolate Old Fashioned \
  Coconut Strawberry Tequila \
  Cosmopolitan \
  Dead Man's Handle \
  French 75 \
  Gin Gimlet \
  Habanero Mango Margarita \
  Lavender Fields \
  Manhattan \
  Maple Bacon Old Fashioned \
  Oaxaca Old Fashioned \
  Paloma \
  Paper Plane \
  Penicillin \
  Prosecco Mojito \
  Sea Legs \
  Spice Trade \
  Spritz \

  #v(0.5em)
  *Glossary*
]


// ═══════════════════════════════════════════════════════════════════
//  INTRODUCTION
// ═══════════════════════════════════════════════════════════════════

#chapter-title[Introduction]

This is not a book for professionals. My goals were to learn about the craft and variety of cocktails, experiment with great ingredients on hand, and complement some fun house parties with drinkable creations.

I've always preferred beer over spirits, except for the occasional margarita. Sweet, salty, and tangy — it usually hides the liquor well. Whiskey I found unpleasant, until I really decided to try to like it in old fashioneds. With enough sweetness and ice cube melt in it, it was tolerable. Even enjoyable sometimes. Gin smells like trees, but isn't bad with tonic and a lime wedge, and I freaking love me some mojitos and fruity pool rum drinks. That was my starting experience with mixed drinks, ordered from bars and restaurants.

For my wife's 30th birthday we did a cocktail tour of DC's Chinatown area, visiting some fancy bars and getting an appreciation for the craft of making high-end cocktails. How are old fashioneds made? Why are they stirred so much? What is mezcal and why is it smoky? I didn't know how to describe a really good drink, but I suppose you know it when you taste it. You combine an ounce of this, a dash of that, and with the right balance of ingredients you can end up with something that transcends the separate parts.

The next personal eye openings were from travel — we went to this bar in Florence, Italy where the bartender would spend at least 90 seconds carefully placing each piece of fruit in a wine glass for this Aperol spritz, it was a work of art. After a while we noticed a cocktail magazine on the wall behind the bar, with him on the cover! Then spring break in Punta Cana, Dominican Republic, there was a bartender who was all about smoked drinks. She used a wood slab sprinkled with cinnamon and wood chips, blasted it with a torch, and covered it with an overturned glass before pouring the drink into it. She also made mocktails for the kids with this smoke bubble contraption that would cover the glass with a smoke-filled bubble.

I just enjoy experimenting, tasty concoctions, and people's reactions when I make something good.

Professional bartenders can impressively deliver quality drinks efficiently and repeatedly in a way I never could. But I don't have to — the advantage of a home bartender is time. I can spend 20 minutes on one drink, try something weird, mess it up, and try again. This book is a collection of those experiments.


// ═══════════════════════════════════════════════════════════════════
//  TOOLS
// ═══════════════════════════════════════════════════════════════════

#chapter-title[Tools]

#section-heading[The Basics]

You can make every recipe in this book with these six things:

#sub-heading[Shaker]
A two-piece cocktail shaker (tin + tin, or tin + glass). The Boston shaker is the professional standard; a cobbler shaker with a built-in strainer works fine at home. Shake without spilling, give it a good whack and pull apart.

#sub-heading[Strainer]
A Hawthorne strainer (the one with a spring coil) for shaker drinks. A julep strainer for mixing glass drinks. In a pinch, hold the lid of a cobbler shaker.

#sub-heading[Jigger]
Measure your pours. Eyeballing works at a bar after years of practice; at home, measure. A standard jigger is 1½ oz / ¾ oz.

#sub-heading[Mixing Glass]
A heavy pint glass or dedicated mixing glass for stirred drinks. Chills and stirs without aerating.

#sub-heading[Stirring Spoon]
A long bar spoon for stirring and floating. The twisted handle controls layered pours.

#sub-heading[Peeler]
For citrus peels and garnishes.

#section-heading[Nice to Have]

#sub-heading[Cocktail Smoking Kit]
For smoked old fashioneds and other spirit-forward drinks. A smoking gun or a wood chip lid smoker adds a theatrical element.

#sub-heading[Zester / Microplane]
For fine citrus zest as a garnish.

#sub-heading[Large Ice Cube Tray]
The big 2" cubes melt more slowly, which means better dilution control in rocks drinks. Worth it.

#sub-heading[Muddler]
For mojitos, smashes, and any drink with fresh herbs or fruit.

#sub-heading[Fine Mesh Strainer]
Double-strain shaken drinks (through the Hawthorne and a fine mesh) to remove ice chips and pulp. Makes a noticeably cleaner drink.


// ═══════════════════════════════════════════════════════════════════
//  TECHNIQUES
// ═══════════════════════════════════════════════════════════════════

#chapter-title[Techniques]

#sub-heading[Stirring vs. Shaking]

The most important decision in making a cocktail is how you combine it.

*Stir* when your drink is all spirits, liqueurs, and syrups — no juice, no dairy, no egg. Stirring chills and dilutes without aeration, keeping the drink clear and silky. Old fashioneds, Negronis, Manhattans — all stirred. Aim for 30–45 seconds.

*Shake* when you have citrus juice, cream, egg white, or anything that needs to be emulsified or broken down. Shaking aerates the drink and creates a slightly cloudy, livelier texture. Margaritas, sours, mojitos — all shaken.

#sub-heading[Dilution]

Dilution is not a mistake — it's an ingredient. A properly diluted cocktail is more complex and drinkable than an undiluted one. The ice melts as you stir or shake, and that water opens up the flavors. This is especially true in spirit-forward drinks like the old fashioned. Don't rush it.

#sub-heading[The Float]

A float sits on top of the drink rather than mixing in. You pour it slowly over the back of a bar spoon held just above the surface, letting it rest as a separate layer. The Penicillin's Laphroaig float is the classic example — you get smoke on the nose before the balanced drink beneath.

#sub-heading[Fat Washing]

Fat washing infuses the flavor of a fat (butter, bacon grease, olive oil, coconut cream) into a spirit. You combine the fat and spirit, let them sit, then freeze until the fat solidifies and can be strained out. The result is a spirit with the fat's flavor but none of the texture. The Maple Bacon Old Fashioned uses this technique with bourbon and bacon grease.

#sub-heading[Muddling]

Muddling extracts oils and juice from fresh ingredients by pressing them with a muddler. The key is to press and twist — not pound. Over-muddled mint becomes bitter; properly muddled mint is bright and aromatic. Same principle applies to citrus wedges and fresh herbs.

#sub-heading[Dry Shaking]

For drinks with egg white, dry shake first — shake without ice — to emulsify the protein before adding ice. This builds a thicker, more stable foam. Then add ice and shake again to chill. See: Lavender Fields.

#sub-heading[Flaming a Citrus Peel]

Hold the peel skin-side down over the drink. Warm the back of the peel with a lighter for a few seconds, then squeeze it so the oils mist toward the flame — they'll briefly ignite in a small burst. This caramelizes the oils and adds a slightly smoky, aromatic note. Run the peel around the rim before dropping it in.

#sub-heading[Batching for a Party]

Almost any cocktail can be batched. The key differences:
- Pre-dilute by 20–25% with water if the batch won't be shaken or stirred with ice at serve time
- Add carbonated ingredients (seltzer, prosecco) at the last moment
- Garnish each drink individually — they don't hold in bulk
- See each recipe's "How to Batch It" section for specific quantities


// ═══════════════════════════════════════════════════════════════════
//  RECIPES
// ═══════════════════════════════════════════════════════════════════

#chapter-title[Recipes]


// ─────────────────────────────────────────────────────────────────
//  Army & Navy
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Army & Navy]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A vintage gin sour with orgeat — bright, nutty, and deceptively simple.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Nutty") #h(4pt)
#tag("Botanical") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Gin],
  [¾ oz], [Fresh lemon juice],
  [½ oz], [Orgeat],
  [1 dash], [Angostura bitters],
)

#divider

#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled coupe.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Gin],
  [6 oz], [Fresh lemon juice],
  [4 oz], [Orgeat],
  [8 dashes], [Angostura bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain.
]

#divider

#sh[Notes]

A Prohibition-era classic, sometimes called the Navy Grog's cousin. The orgeat gives it a rich, nutty sweetness that pairs beautifully with gin's botanicals. London Dry gin works best here. The single dash of Angostura adds just enough complexity.

#callout[*If you like this, try:* Sea Legs (orgeat + mezcal/scotch), Dead Man's Handle (tequila riff on same template), Gin Gimlet (clean gin sour, no orgeat)]


// ─────────────────────────────────────────────────────────────────
//  Bubbly Mojito
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Bubbly Mojito]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A rum mojito finished with sparkling wine — fresh, minty, and celebratory.
  ]
  #v(0.3em)
]

#metadata-bar("Collins", "Shaken + built", "Crushed", "Easy")

#v(0.3em)
#tag("Herbal") #h(4pt)
#tag("Citrus") #h(4pt)
#tag("Fruity") #h(4pt)
#tag("Bubbly")


#divider

#sh[Ingredients]

#ingredients(
  [6], [Fresh mint leaves],
  [¾ oz], [Fresh lime juice (½ lime, cut up and muddled)],
  [½ oz], [Simple syrup],
  [2 oz], [White rum],
  [3 oz], [Sparkling wine (Prosecco or Champagne)],
)

#divider

#sh[Method]

+ In a shaker, muddle mint leaves, lime wedges, simple syrup, and rum together.
+ Add crushed ice and shake briefly.
+ Pour everything (including ice) into a Collins glass.
+ Top with sparkling wine and stir gently to combine.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [~48], [Fresh mint leaves],
  [6 oz], [Fresh lime juice + 4 limes quartered],
  [4 oz], [Simple syrup],
  [16 oz], [White rum],
  [24 oz], [Sparkling wine (1 bottle)],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Muddle mint and lime in batches, combine with rum and syrup, refrigerate. Pour over crushed ice, top each glass with ~3 oz sparkling wine.
]

#divider

#sh[Notes]

The crushed ice + pour-everything-out technique keeps the drink integrated and well-diluted. Sparkling wine adds elegance; a light Prosecco works best to avoid overpowering the mint. See also: Prosecco Mojito for an alternate build.


// ─────────────────────────────────────────────────────────────────
//  Chocolate Old Fashioned
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Chocolate Old Fashioned]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A rich, dessert-leaning Old Fashioned — bourbon deepened with chocolate liqueur and a whisper of maple.
  ]
  #v(0.3em)
]

#metadata-bar("Rocks", "Stirred", "Large cube", "Easy")

#v(0.3em)
#tag("Chocolate") #h(4pt)
#tag("Rich") #h(4pt)
#tag("Sweet") #h(4pt)
#tag("Spirit-forward")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Bourbon],
  [½ oz], [Cioccolato liqueur (Tempus Fugit, Mozart, or Godiva)],
  [1 bar spoon], [Maple syrup],
  [2 dashes], [Chocolate bitters (Xocolatl Mole or Aztec Chocolate)],
)

*Garnish:* Orange peel (expressed)

#divider

#sh[Method]

+ Combine bourbon, cioccolato liqueur, maple syrup, and bitters in a mixing glass with ice.
+ Stir well until chilled and diluted (~30 seconds).
+ Strain over a large cube in a rocks glass.
+ Express an orange peel over the glass, run around the rim, and drop in.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Bourbon],
  [4 oz], [Cioccolato liqueur],
  [~2 oz], [Maple syrup (8 bar spoons)],
  [16 dashes], [Chocolate bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Add 2 oz water to pre-dilute. Stir briefly before serving over large cubes. Garnish to order.
]

#divider

#sh[Notes]

An original riff on the Old Fashioned. The key is restraint — maple syrup is just 1 bar spoon (the card crossed out ¼ oz as too much). Orange peel is essential for brightness against all that richness.

#callout[*If you like this, try:* Maple Bacon Old Fashioned (the other original OF riff), Manhattan (stirred bourbon classic with a modifying liqueur)]


// ─────────────────────────────────────────────────────────────────
//  Coconut Strawberry Tequila
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #v(0.3em)
  #text(size: 20pt, weight: "bold", fill: accent)[Coconut Strawberry Tequila]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A fruity, tropical tequila cocktail with a hint of smoke and heat — born at a house party.
  ]
  #v(0.3em)
]

#metadata-bar("Rocks / Coupe", "Shaken", "Cubed / Large cube", "Easy")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [Coconut tequila],
  [½ oz], [Mezcal],
  [½ oz], [Fresh lime juice],
  [½ oz], [Triple sec],
  [½ tsp], [Agave nectar],
  [Dash], [Hot bitters],
)

#divider

#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into a glass over ice.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [Coconut tequila],
  [4 oz], [Mezcal],
  [4 oz], [Fresh lime juice],
  [4 oz], [Triple sec],
  [4 tsp], [Agave nectar],
  [], [Hot bitters to taste],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake individual portions with ice or serve over ice directly.
]

#divider

#sh[Notes]

Recipe by Wilson, developed 11/29. The mezcal adds backbone to what could otherwise be a sweet drink. Hot bitters are the secret weapon — just a dash ties everything together.


// ─────────────────────────────────────────────────────────────────
//  Cosmopolitan
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Cosmopolitan]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    The iconic vodka sour — citrusy, rosy, and effortlessly elegant.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Fruity") #h(4pt)
#tag("Tart") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [Vodka],
  [¾ oz], [Triple sec (Cointreau preferred)],
  [¾ oz], [Fresh lime juice],
  [¾ oz], [Cranberry juice],
)

*Garnish:* Orange peel (expressed)

#divider

#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled coupe.
+ Express an orange peel over the glass and garnish.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [Vodka],
  [6 oz], [Triple sec],
  [6 oz], [Fresh lime juice],
  [6 oz], [Cranberry juice],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain. Garnish to order.
]

#divider

#sh[Notes]

Made iconic by Sex and the City but a genuinely well-balanced cocktail. Cointreau makes a noticeably better Cosmo than generic triple sec. Use just enough cranberry to turn it pink; too much makes it sweet and flat. The orange peel garnish is non-negotiable.


// ─────────────────────────────────────────────────────────────────
//  Dead Man's Handle
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Dead Man's Handle]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A tequila sour with orgeat and Aperol — bright, nutty, and just a little bitter.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Nutty") #h(4pt)
#tag("Bitter") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [Blanco tequila (can sub rum)],
  [½ oz], [Aperol],
  [½ oz], [Fresh lime juice],
  [½ oz], [Orgeat],
)

#divider

#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled coupe.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [Blanco tequila],
  [4 oz], [Aperol],
  [4 oz], [Fresh lime juice],
  [4 oz], [Orgeat],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain.
]

#divider

#sh[Notes]

An original built on the same orgeat-citrus template as the Army & Navy, but with tequila and lime instead of gin and lemon. The Aperol adds a bitter orange note that ties it together. Subbing rum pushes it toward Mai Tai territory.

#callout[*If you like this, try:* Army & Navy (the gin version), Paper Plane (also uses Aperol in an equal-parts drink)]


// ─────────────────────────────────────────────────────────────────
//  French 75
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[French 75]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A gin sour topped with Champagne — celebratory, bright, and dangerously drinkable.
  ]
  #v(0.3em)
]

#metadata-bar("Flute / Coupe", "Shaken + built", "None · up", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Bubbly") #h(4pt)
#tag("Botanical") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [Gin],
  [½ oz], [Fresh lemon juice],
  [½ oz], [Simple syrup],
  [3 oz], [Champagne, Brut, or dry sparkling wine],
)

#divider

#sh[Method]

+ Combine gin, lemon juice, and simple syrup in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled flute or coupe.
+ Top with Champagne and stir once gently.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [Gin],
  [4 oz], [Fresh lemon juice],
  [4 oz], [Simple syrup],
  [1 bottle], [Champagne or Prosecco (750ml)],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine gin, lemon, and syrup and refrigerate. Pour ~2½ oz per serving into a flute, top with ~3 oz sparkling wine to order.
]

#divider

#sh[Notes]

A WWI-era classic named for the French 75mm field gun — it's supposed to have a kick. A dry Champagne or Crémant works beautifully; Prosecco is sweeter but perfectly fine. Don't over-sweet the base — the sparkling wine adds its own sugar.


// ─────────────────────────────────────────────────────────────────
//  Gin Gimlet
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Gin Gimlet]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A clean, tart classic — gin, lime, and just enough sweetness.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Botanical") #h(4pt)
#tag("Tart")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Gin],
  [¾ oz], [Fresh lime juice],
  [¾ oz], [Simple syrup],
)

*Variation:* Add 1–2 oz sparkling water, serve in a Collins glass over ice for a longer, more refreshing build.

#divider

#sh[Method]

+ Combine gin, lime juice, and simple syrup in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled coupe.

_For the Collins variation:_ Shake as above, strain into a Collins glass over ice, top with sparkling water and stir gently.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Gin],
  [6 oz], [Fresh lime juice],
  [6 oz], [Simple syrup],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain.
]

#divider

#sh[Notes]

One of the simplest and most reliable gin drinks. The key is fresh lime — Rose's sweetened lime cordial is traditional but fresh juice with simple syrup is crisper. A floral gin (Hendrick's) or classic London Dry (Tanqueray) both work well.

#callout[*If you like this, try:* Lavender Fields (floral gin sour), Spice Trade (cinnamon + basil gin sour)]


// ─────────────────────────────────────────────────────────────────
//  Habanero Mango Margarita
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #v(0.3em)
  #text(size: 18pt, weight: "bold", fill: accent)[Habanero Mango Margarita]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A sweet, spicy, citrusy margarita with house-made mango habanero syrup.
  ]
  #v(0.3em)
]

#metadata-bar("Margarita / Rocks", "Shaken", "Cubed", "Medium")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Tequila blanco],
  [1 oz], [Fresh lime juice],
  [¾ oz], [Mango habanero syrup],
  [½ oz], [Triple sec or Cointreau],
)

Tajin or salt rim

#divider

#sh[House-Made Mango Habanero Syrup]

_Makes ~3 oz. Keeps 1–2 weeks refrigerated._

#ingredients(
  [½ cup], [Agave nectar],
  [½ cup], [Mango juice],
  [2], [Habanero peppers, halved and de-stemmed],
  [Pinch], [Salt],
)

+ Combine all ingredients in a saucepan.
+ Simmer for 5 minutes.
+ Remove from heat and let sit for 20 minutes.
+ Strain into a jar and refrigerate.

#divider

#sh[Method]

+ Rim glass with lime and tajin (or salt).
+ Combine tequila, lime juice, mango habanero syrup, and triple sec in a shaker with ice.
+ Shake well until chilled.
+ Strain into glass over ice.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Tequila blanco],
  [8 oz], [Fresh lime juice],
  [6 oz], [Mango habanero syrup],
  [4 oz], [Triple sec],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake individual portions or pour over ice. Rim glasses individually.
]

#divider

#sh[Notes]

Adjust heat by varying habanero steep time. For less spice, remove peppers after 10 minutes. For more, leave the full 20. Blanco tequila keeps the mango front and center — reposado will add earthiness.


// ─────────────────────────────────────────────────────────────────
//  Lavender Fields
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Lavender Fields]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A floral, elegant gin cocktail with elderflower and a silky egg white foam.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Dry shake + shaken", "None · up", "Medium")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Gin],
  [½ oz], [Elderflower liqueur (St-Germain)],
  [¾ oz], [Lavender honey syrup],
  [1], [Egg white],
  [2 dashes], [Orange bitters],
)

#divider

#sh[House-Made Lavender Honey Syrup]

_Makes ~6 oz. Keeps 2 weeks refrigerated._

#ingredients(
  [1½ oz], [Dried lavender],
  [½ cup], [Honey],
  [½ cup], [Water],
)

+ Combine honey and water in a saucepan and bring to a boil.
+ Add lavender, reduce heat, and simmer for 5 minutes.
+ Remove from heat and steep for 10 minutes.
+ Strain through a fine mesh strainer and refrigerate.

#divider

#sh[Method]

+ Combine all ingredients in a shaker *without ice*.
+ Dry shake vigorously for 15 seconds to emulsify the egg white.
+ Add ice and shake again until well chilled.
+ Double-strain into a chilled coupe.
+ The egg white foam will settle on top naturally.

#divider

#sh[Batch · 8 Servings (without egg white)]

#ingredients(
  [16 oz], [Gin],
  [4 oz], [Elderflower liqueur],
  [6 oz], [Lavender honey syrup],
  [16 dashes], [Orange bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Dry shake each serving individually with 1 egg white before adding ice.
]

#divider

#sh[Notes]

The dry shake is essential — it builds the foam before ice dilutes the mixture. A London Dry gin lets the lavender and elderflower shine; Hendricks also works beautifully. If avoiding raw egg, aquafaba (chickpea liquid) is a solid substitute.


// ─────────────────────────────────────────────────────────────────
//  Manhattan
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Manhattan]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    The stirred whiskey classic — rich, sweet, and bittersweet with a cherry.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Stirred", "None · up", "Easy")

#v(0.3em)
#tag("Spirit-forward") #h(4pt)
#tag("Sweet") #h(4pt)
#tag("Bitter") #h(4pt)
#tag("Rich")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Bourbon],
  [1 oz], [Sweet vermouth],
  [2 dashes], [Angostura bitters],
)

*Garnish:* Luxardo cherry (or quality maraschino)

#divider

#sh[Method]

+ Combine bourbon, sweet vermouth, and bitters in a mixing glass with ice.
+ Stir well until chilled and properly diluted (~30 seconds).
+ Strain into a chilled coupe.
+ Garnish with a cherry.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Bourbon],
  [8 oz], [Sweet vermouth],
  [16 dashes], [Angostura bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Stir each serving individually with ice and strain, or pre-dilute the batch with 3 oz water and serve over a large ice cube.
]

#divider

#sh[Notes]

One of the great stirred classics alongside the Old Fashioned and Negroni. Bourbon gives it sweetness and vanilla; rye gives it spice and dryness — both work, choose by mood. Carpano Antica Formula is a go-to sweet vermouth; Dolin Rouge is lighter. Use a Luxardo cherry, not the neon red kind.

#callout[*If you like this, try:* Maple Bacon Old Fashioned (stirred, spirit-forward with a twist), Oaxaca Old Fashioned (mezcal cousin, equally stirred)]


// ─────────────────────────────────────────────────────────────────
//  Maple Bacon Old Fashioned
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #v(0.3em)
  #text(size: 18pt, weight: "bold", fill: accent)[Maple Bacon Old Fashioned]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A rich, smoky old fashioned with fat-washed bourbon and maple syrup — a showstopper.
  ]
  #v(0.3em)
]

#metadata-bar("Rocks", "Stirred", "Large cube", "Advanced")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Bacon-washed bourbon],
  [1 bar spoon], [Maple syrup],
  [2 dashes], [Angostura bitters],
)

*Garnish:* Orange peel or bacon strip

#divider

#sh[House-Made Bacon-Washed Bourbon]

_Makes one bottle. Keeps indefinitely refrigerated._

+ Bake a tray of bacon until crispy — 15 minutes at 375°F.
+ Save the rendered grease in a jar and let it cool, but not harden.
+ Add bourbon to the jar and let it sit for 4+ hours at room temperature.
+ Transfer to the freezer for 1+ hours until the fat solidifies on top.
+ Strain through a coffee filter into a fresh jar to remove all solids.

#divider

#sh[Method]

+ Combine fat-washed bourbon, maple syrup, and bitters in a mixing glass with ice.
+ Stir slowly until well chilled and diluted — about 45 seconds.
+ Strain into a rocks glass over a large ice cube.
+ Garnish with an orange peel or a strip of the bacon you cooked.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Bacon-washed bourbon],
  [8 bar spoons], [Maple syrup],
  [16 dashes], [Angostura bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Stir with ice until diluted, strain into a bottle, refrigerate. Pour over large ice cube to serve.
]

#divider

#sh[Notes]

Fat-washing infuses the fat's flavor into the spirit, then removes the fat through freezing. The result is a silky, bacon-scented bourbon with no grease. Use a bold bourbon — Knob Creek or Elijah Craig work well.


// ─────────────────────────────────────────────────────────────────
//  Oaxaca Old Fashioned
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #v(0.3em)
  #text(size: 20pt, weight: "bold", fill: accent)[Oaxaca Old Fashioned]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A smoky, spirit-forward riff on the classic — reposado and mezcal with cocoa bitters and a flamed orange peel.
  ]
  #v(0.3em)
]

#metadata-bar("Rocks", "Stirred", "Large cube", "Medium")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [Reposado tequila],
  [½ oz], [Mezcal],
  [½ oz], [Agave nectar],
  [2 dashes], [Cocoa bitters],
)

*Garnish:* Flamed orange peel

#divider

#sh[Method]

+ Combine reposado, mezcal, agave, and cocoa bitters in a mixing glass with ice.
+ Stir slowly for 45–60 seconds — don't rush it. Dilution is everything in an old fashioned.
+ Let it rest in the glass for 1 minute before straining.
+ Strain into a rocks glass over a large ice cube.
+ To flame the orange peel: hold it skin-side down over the drink, warm the back briefly with a lighter until the oils mist and ignite in a small burst. Run the peel around the rim and drop it in.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [Reposado tequila],
  [4 oz], [Mezcal],
  [4 oz], [Agave nectar],
  [16 dashes], [Cocoa bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Stir with ice until well diluted, strain into a bottle, refrigerate. Pour over a large ice cube to serve. Garnish each glass individually with a flamed orange peel.
]

#divider

#sh[Notes]

The split of reposado and mezcal gives you agave sweetness from the tequila and smokiness from the mezcal. Cocoa bitters tie them together without overpowering. Don't skip the flamed peel — the citrus oil transforms the nose of the drink.


// ─────────────────────────────────────────────────────────────────
//  Paloma
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Paloma]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    Mexico's most popular cocktail — bright, citrusy, and infinitely refreshing.
  ]
  #v(0.3em)
]

#metadata-bar("Highball", "Shaken, topped", "Cubed", "Easy")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Tequila reposado (or mezcal for a smokier variation)],
  [1 oz], [Fresh grapefruit juice],
  [½ oz], [Fresh lime juice],
  [¼ oz], [Agave nectar],
  [2 oz], [Grapefruit seltzer],
)

Salt rim

#divider

#sh[Method]

+ Run a lime wedge around the rim of a highball glass and dip in salt.
+ Combine tequila, grapefruit juice, lime juice, and agave in a shaker with ice.
+ Shake well until chilled.
+ Fill glass with ice, strain in the shaken mixture.
+ Top with grapefruit seltzer and stir gently to combine.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Tequila reposado],
  [8 oz], [Fresh grapefruit juice],
  [4 oz], [Fresh lime juice],
  [2 oz], [Agave nectar],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Add 2 oz grapefruit seltzer per glass at serve time. Salt rims individually.
]

#divider

#sh[Notes]

Mezcal in place of reposado adds a smoky dimension that pairs beautifully with grapefruit. Jarritos Toronja or Fever-Tree Pink Grapefruit are both solid seltzer choices.


// ─────────────────────────────────────────────────────────────────
//  Paper Plane
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Paper Plane]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    An equal-parts modern classic — bourbon, amaro, Aperol, and lemon in perfect balance.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe / Rocks", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Bitter") #h(4pt)
#tag("Citrus") #h(4pt)
#tag("Herbal") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [¾ oz], [Bourbon],
  [¾ oz], [Amaro Nonino],
  [¾ oz], [Aperol],
  [½ oz], [Fresh lemon juice (standard is ¾ oz; Dan prefers ½ oz)],
)

#divider

#sh[Method]

+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into a chilled coupe (or over a large cube in a rocks glass).

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [6 oz], [Bourbon],
  [6 oz], [Amaro Nonino],
  [6 oz], [Aperol],
  [4 oz], [Fresh lemon juice],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain.
]

#divider

#sh[Notes]

Created by Sam Ross at Milk & Honey, NYC. The equal-parts template at its most elegant. Amaro Nonino is essential; other amaros will change the character significantly.

#callout[*Variations:* Sub mezcal for bourbon for a smoky version. Sub mezcal for bourbon *and* Yellow Chartreuse for Amaro Nonino to make a Naked & Famous.]


// ─────────────────────────────────────────────────────────────────
//  Penicillin
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Penicillin]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A modern classic — blended scotch with fresh lemon, honey-ginger syrup, and a smoky Laphroaig float.
  ]
  #v(0.3em)
]

#metadata-bar("Rocks", "Shaken", "Large cube", "Medium")

#v(0.3em)
#tag("Smoky") #h(4pt)
#tag("Sour") #h(4pt)
#tag("Spice") #h(4pt)
#tag("Herbal")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Blended scotch],
  [¾ oz], [Fresh lemon juice],
  [¾ oz], [Honey-ginger syrup],
)

*Float:* ¼ oz Laphroaig (or other Islay single malt)

#divider

#sh[House-Made Honey-Ginger Syrup]

_Makes ~4 oz. Keeps 2–3 weeks refrigerated._

#ingredients(
  [], [Equal parts honey and boiling water],
  [], [Minced fresh ginger (~2 tbsp per cup of liquid)],
)

+ Combine honey and boiling water in a saucepan and stir to dissolve.
+ Add minced ginger.
+ Boil for 5 minutes, then remove from heat and steep for 10 minutes.
+ Strain through a fine mesh strainer into a jar and refrigerate.

#divider

#sh[Method]

+ Combine scotch, lemon juice, and honey-ginger syrup in a shaker with ice.
+ Shake well until chilled.
+ Strain into a rocks glass over a large ice cube.
+ Float ¼ oz Laphroaig by pouring slowly over the back of a bar spoon — don't stir it in.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Blended scotch],
  [6 oz], [Fresh lemon juice],
  [6 oz], [Honey-ginger syrup],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain. Float ¼ oz Laphroaig per glass at serve time.
]

#divider

#sh[Notes]

Created by Sam Ross at Milk & Honey, NYC in 2005. The Laphroaig float is non-negotiable — it sits on top and hits your nose before the first sip. Don't skip the fresh lemon; bottled juice won't do it justice. Blended scotch (Monkey Shoulder, Famous Grouse) in the base keeps the drink from getting too peaty throughout.

#callout[*If you like this, try:* Sea Legs (scotch + mezcal with orgeat and celery bitters), Paper Plane (another modern classic with citrus and bitter balance)]


// ─────────────────────────────────────────────────────────────────
//  Prosecco Mojito
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Prosecco Mojito]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A bubbly, festive twist on the mojito — lighter on rum, topped with prosecco.
  ]
  #v(0.3em)
]

#metadata-bar("Highball / Wine", "Muddled, topped", "Crushed / Cubed", "Easy")


#divider

#sh[Ingredients]

#ingredients(
  [1½ oz], [White rum],
  [¾ oz], [Fresh lime juice],
  [½ oz], [Simple syrup],
  [8–10], [Fresh mint leaves],
  [2 oz], [Prosecco],
)

*Garnish:* Mint sprig

#divider

#sh[Method]

+ Add mint leaves and simple syrup to a glass and gently muddle — press, don't shred.
+ Fill glass with ice.
+ Add rum and lime juice, stir briefly.
+ Top with prosecco and stir once gently.
+ Garnish with a mint sprig.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [12 oz], [White rum],
  [6 oz], [Fresh lime juice],
  [4 oz], [Simple syrup],
  [], [Large handful of mint, muddled and strained out],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine rum, lime, syrup, and muddled mint. Refrigerate. Add 2 oz prosecco per glass at serve time.
]

#divider

#sh[Notes]

Don't over-muddle the mint — you want the oils, not the bitterness from the stems. Prosecco adds effervescence without the sweetness of tonic. Cava or any dry sparkling wine works just as well.


// ─────────────────────────────────────────────────────────────────
//  Sea Legs
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Sea Legs]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A smoky, nutty, savory coupe — scotch and mezcal meet orgeat and celery, with a salt rim.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Medium")

#v(0.3em)
#tag("Smoky") #h(4pt)
#tag("Nutty") #h(4pt)
#tag("Citrus") #h(4pt)
#tag("Savory")


#divider

#sh[Ingredients]

#ingredients(
  [1 oz], [Scotch],
  [1 oz], [Mezcal],
  [¾ oz], [Fresh lime juice],
  [¾ oz], [Orgeat],
  [2 dashes], [Celery bitters],
)

*Garnish:* Salt rim

#divider

#sh[Method]

+ Run a lime wedge around the rim of a coupe and dip in salt.
+ Combine all ingredients in a shaker with ice.
+ Shake well until chilled.
+ Strain into the salted coupe.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [8 oz], [Scotch],
  [8 oz], [Mezcal],
  [6 oz], [Fresh lime juice],
  [6 oz], [Orgeat],
  [16 dashes], [Celery bitters],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Shake each serving individually with ice and strain. Salt rims to order.
]

#divider

#sh[Notes]

An original with a bold concept: two smoky spirits, almond sweetness from orgeat, bright lime, and the unexpected vegetal note of celery bitters — finished with a salt rim. Fee Brothers and The Bitter Truth both make good celery bitters.

#callout[*If you like this, try:* Oaxaca Old Fashioned (mezcal, spirit-forward, stirred), Penicillin (scotch-forward, citrus-driven, smoky)]


// ─────────────────────────────────────────────────────────────────
//  Spice Trade
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Spice Trade]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A simple, crushable gin sour — cinnamon warmth meets bright basil and lemon.
  ]
  #v(0.3em)
]

#metadata-bar("Coupe", "Shaken", "None · up", "Easy")

#v(0.3em)
#tag("Herbal") #h(4pt)
#tag("Spice") #h(4pt)
#tag("Citrus") #h(4pt)
#tag("Floral")


#divider

#sh[Ingredients]

#ingredients(
  [2 oz], [Gin],
  [¾ oz], [Cinnamon syrup],
  [¾ oz], [Fresh lemon juice],
  [2–3], [Fresh basil leaves],
)

#divider

#sh[House-Made Cinnamon Syrup]

#ingredients(
  [1 cup], [Water],
  [1 cup], [White sugar],
  [3–4], [Cinnamon sticks],
)

Combine in a saucepan over medium heat, stirring until sugar dissolves. Simmer 10 minutes. Remove from heat, let steep 30 minutes, then strain. Keeps refrigerated for 2–3 weeks.

#divider

#sh[Method]

+ Muddle 2–3 basil leaves gently in the bottom of a shaker — bruise, don't shred.
+ Add gin, cinnamon syrup, and lemon juice.
+ Add ice and shake well until thoroughly chilled.
+ Fine-strain into a chilled coupe.

#divider

#sh[Batch · 8 Servings]

#ingredients(
  [16 oz], [Gin],
  [6 oz], [Cinnamon syrup],
  [6 oz], [Fresh lemon juice],
  [], [Basil leaves (muddle individually per serving)],
)

#divider

#sh[Notes]

Created by bartender Nathan Howard at Cole's. The pairing of cinnamon and basil is the whole idea — warm spice and cool herb, both playing off the brightness of the lemon. Gin with enough body (London Dry or contemporary) works best; avoid anything too light or the cinnamon will dominate.

#callout[*If you like this, try:* Lavender Fields (another gin sour with an unexpected herb), Penicillin (warming spice against citrus in a spirit sour)]


// ─────────────────────────────────────────────────────────────────
//  Spritz
// ─────────────────────────────────────────────────────────────────
#pagebreak()

#align(center)[
  #text(size: 22pt, weight: "bold", fill: accent)[Spritz]
  #v(0.3em)
  #text(size: 9.5pt, style: "italic", fill: muted)[
    A limoncello-Aperol spritz — bright citrus and gentle bitterness with bubbles.
  ]
  #v(0.3em)
]

#metadata-bar("Wine glass", "Shaken + built", "Over ice", "Easy")

#v(0.3em)
#tag("Citrus") #h(4pt)
#tag("Bubbly") #h(4pt)
#tag("Bitter") #h(4pt)
#tag("Bright")


#divider

#sh[Ingredients]

#ingredients(
  [1 oz], [Limoncello],
  [½ oz], [Aperol],
  [¼ oz], [Simple syrup],
  [¼ oz], [Fresh lemon juice],
  [2 oz], [Prosecco],
  [½ oz], [Seltzer],
)

#divider

#sh[Method]

+ Combine limoncello, Aperol, simple syrup, and lemon juice in a shaker with ice.
+ Shake briefly until chilled.
+ Strain into a wine glass over ice.
+ Top with Prosecco and seltzer, stir gently.

#divider

#sh[Batch · 6 Servings (Dan's original batch)]

#ingredients(
  [6 oz], [Limoncello],
  [3 oz], [Aperol],
  [3 oz], [Simple syrup],
  [1½ oz], [Fresh lemon juice],
)

#v(0.2em)
#text(size: 8.5pt, style: "italic")[
  Combine and refrigerate. Pour ~2 oz of mix per serving over ice, top with Prosecco and a splash of seltzer to order.
]

#divider

#sh[Notes]

A more composed, cocktail-forward take on the Aperol Spritz — the limoncello and fresh lemon juice add real citrus depth that the classic recipe lacks. Dan wrote the 6x batch directly on the card, which suggests this gets made in quantity.

#callout[*If you like this, try:* Prosecco Mojito (bubbly, citrusy crowd-pleaser), Paloma (refreshing and citrusy with a bitter edge)]


// ═══════════════════════════════════════════════════════════════════
//  GLOSSARY
// ═══════════════════════════════════════════════════════════════════

#chapter-title[Glossary]

#let term(name, definition) = {
  v(0.4em)
  [*#name* — #definition]
}

#term("Agave nectar")[A sweetener made from the agave plant, used in tequila and mezcal cocktails in place of simple syrup. Slightly more complex and less cloying than plain sugar syrup.]

#term("Angostura bitters")[The most common cocktail bitters. Dark, aromatic, and spiced. A few dashes add depth to almost any spirit-forward drink.]

#term("Bar spoon")[A long-handled spoon used for stirring and floating. The twisted handle helps control the pour for layered drinks.]

#term("Blended scotch")[Scotch whisky made from a blend of malt and grain whiskies. Approachable and versatile in cocktails. Dewars, Famous Grouse, or Monkey Shoulder all work in a Penicillin.]

#term("Cointreau / Triple sec")[Orange liqueurs used as a modifier in sours and margaritas. Cointreau is higher quality; triple sec is the generic category.]

#term("Dry shake")[Shaking without ice, used to emulsify egg white before chilling.]

#term("Elderflower liqueur")[A sweet, floral liqueur made from elderflower blossoms. St-Germain is the standard brand. Pairs beautifully with gin and tequila.]

#term("Fat washing")[A technique for infusing flavor from a fat into a spirit. See Techniques.]

#term("Float")[A small pour of a spirit or liqueur on top of a finished drink, added without mixing in.]

#term("Jigger")[A small measuring tool for spirits. The standard jigger measures 1½ oz on one side and ¾ oz on the other.]

#term("Laphroaig")[A heavily peated, smoky Islay single malt scotch. Used as the float in a Penicillin for its pronounced smoke and iodine character.]

#term("Mezcal")[A Mexican spirit made from agave, similar to tequila but typically smokier. Made from various agave varieties vs. tequila which is exclusively blue agave.]

#term("Muddling")[Pressing fresh ingredients to release oils and juice.]

#term("Reposado")[Tequila that has been aged in oak barrels for 2–12 months. Smoother and more complex than blanco, with light vanilla and caramel notes.]

#term("Simple syrup")[Equal parts sugar and water, dissolved. 1:1 ratio is standard; 2:1 (rich simple syrup) is sweeter and thicker.]

#term("Strainer")[Used after shaking or stirring to remove ice before pouring. A Hawthorne strainer fits over a shaker tin; a julep strainer fits inside a mixing glass.]
