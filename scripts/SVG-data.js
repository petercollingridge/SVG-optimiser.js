// Information about SVGs

// We can remove any style given a default value
var defaultStyles = {
    "display": "inline",
    "visibility": "visible",
    "opacity": "1",
    "enable-background": "accumulate",
    "fill": "#000000",
    "fill-opacity": "1",
    "fill-rule": "nonzero",
    "marker": "none",
    "marker-start": "none",
    "marker-mid": "none",
    "marker-end": "none",
    "stroke": "none",
    "stroke-width": "1",
    "stroke-opacity": "1",
    "stroke-miterlimit": "4",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
    "stroke-dasharray": "none",
    "stroke-dashoffset": "0",
    "stop-opacity": 1,
    "font-anchor": "start",
    "font-style": "normal",
    "font-weight": "normal",
    "font-stretch": "normal",
    "font-variant": "normal"
};

// Styles that can probably be removed
var nonEssentialStyles = {
    "color" : true,
    "display" : true,
    "overflow" : true,
    "fill-rule" : true,
    "clip-rule" : true,
    "stroke-miterlimit" : true
};

// Attribute which determine the size or position of elements
var positionAttributes = [
];