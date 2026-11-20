# Recipe Image Prompts

Gemini prompts for each recipe's two images. Name the outputs `<slug>.jpg` and `<slug>-ingredients.png`, drop them in `intake/photos/`, and run `npm run photos` (see CLAUDE.md, Image fields).

## Featured photo (`hero_image`)

Generate it in 3:4 portrait. The hero/card frame is 4:5.

```
photorealistic image of one glass on the granite countertop with black bg
```

## Ingredients illustration (`gallery`)

```
Hand-drawn colored pencil illustration of cocktail ingredient bottles and decanters arranged neatly in a horizontal row on a solid matte black background. Detailed, realistic pencil texture, vibrant colors, clear readable labels, clean isolated artwork, studio illustration style
```
