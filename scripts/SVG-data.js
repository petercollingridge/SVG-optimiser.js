// Information about SVGs

// We can remove any style given a default value
var defaultStyles = {
    'clip': 'auto',
    'clip-path': 'none',
    'clip-rule': 'nonzero',
    'cursor': 'auto',
    'display': 'inline',
    'visibility': 'visible',
    'opacity': '1',
    'enable-background': 'accumulate',
    'fill': '#000',
    'fill-opacity': 1,
    'fill-rule': 'nonzero',
    'marker': 'none',
    'marker-start': 'none',
    'marker-mid': 'none',
    'marker-end': 'none',
    'stroke': 'none',
    'stroke-width': 1,
    'stroke-opacity': 1,
    'stroke-miterlimit': 4,
    'stroke-linecap': 'butt',
    'stroke-linejoin': 'miter',
    'stroke-dasharray': 'none',
    'stroke-dashoffset': 0,
    'stop-opacity': 1,
    'font-anchor': 'start',
    'font-style': 'normal',
    'font-weight': 'normal',
    'font-stretch': 'normal',
    'font-variant': 'normal',
    'text-anchor': 'start',
    'text-anchor': 'start',
    'writing-mode': 'lr-tb',
    'pointer-events': 'visiblePainted'
};

// Styles that can probably be removed
var nonEssentialStyles = {
    'color' : true,
    'display' : true,
    'overflow' : true,
    'fill-rule' : true,
    'clip-rule' : true,
    'nodetypes' : true,
    'stroke-miterlimit' : true
};

// Attributes that are required otherwise no shape is drawn
var essentialAttributes = {
    'path': ['d'],
    'polygon': ['points'],
    'polyline': ['points'],
    'rect': ['width', 'height'],
    'circle': ['r'],
    'ellipse': ['r'],
};

// Attribute which determine the size or position of elements
// The default value of these is 0
var positionAttributes = [
    'x', 'y', 'width', 'height', 'rx', 'ry',
    'cx', 'cy', 'r',
    'x1', 'x2', 'y1', 'y2'
];