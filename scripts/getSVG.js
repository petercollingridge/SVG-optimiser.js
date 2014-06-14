// http://stackoverflow.com/questions/6507293/convert-xml-to-string-with-jquery
function xmlToString(xmlData) { 
    var xmlString;
    if (window.ActiveXObject){
        // IE
        xmlString = xmlData.xml;
    } else {
        // Mozilla, Firefox, Opera, etc.
        xmlString = (new XMLSerializer()).serializeToString(xmlData);
    }
    return xmlString;
}

// Get an SVG from the server and add a string version to textarea
// Quite inefficient as we're going to convert it back to a XML object later.
function getExampleSVG(filename) {
    $.get("examples/" + filename + ".svg", function(data) {
        $("#input-svg").val(xmlToString(data));
    });
}

// Parse an SVG string as XML
function stringToXML(svgString) {
    // Replace any leading whitespace which will mess up XML parsing
    whitespace =  svgString.replace(/^[\s\n]*/, "");

    // Parse SVG as XML
    var svgDoc = $.parseXML(svgString);
}

// Get SVG string from textarea with given id
function getSVGString(id) {
    var svgString = $('#input-svg').val()
    stringToXML(svgString);
}