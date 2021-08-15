# `SVG-optimiser.js`
> An online SVG optimiser using JavaScript and jQuery

## Using `optimise-functions.js` and `SVG-elements.js`

### Create an `SVG_Root` object
The `SVG_Root` object is what parses the SVG and allows you to access the optimisation functions. You can pass it either a complete SVG or an SVG element (which can have child elements).

You can pass it a string with: 
`var SVGObject = SVG_Root('<path d="M10 20 M 30 40"/>');`

Or a jQuery object with: 
`var SVGObject = SVG_Root($('#my-svg'));`

### Optimise the SVG
Optimisation is done with: `svg.optimise();`

There are many options which I will have to write about at some point.

### Write the SVG
You can get the SVG as a string with:
`SVGObject.write();`

Or as a DOM element with:
`SVGObject.createSVGObject();`

## Licence
- [MIT](./LICENSE)