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

// Parse an SVG string as XML
function stringToXML(svgString) {
    // Replace any leading whitespace which will mess up XML parsing
    svgString =  svgString.replace(/^[\s\n]*/, "");

    if (!svgString) { return; }

    // Parse SVG as XML
    var svgDoc;
    try {
        svgDoc = $.parseXML(svgString);
    } catch (err) {
        alert("Unable to parse SVG")
    }

    return svgDoc;
}

// Get an SVG from the server and add a string version to textarea
// Quite inefficient as we're going to convert it back to a XML object later.
function getExampleSVG(filename) {
    $.get("examples/" + filename + ".svg", function(data) {
        $("#input-svg").val(xmlToString(data));
    });
}

// Convert string into filesize
var getFileSize = function(str) {
    var size = str.length / 1000;
    if (size > 1000) {
        return (Math.round(size / 100) / 10) + " MB";
    } else {
        return (Math.round(size * 10) / 10) + " kB";
    }
};

// Clear element with given selector and add contents
function addContentsToDiv(contents, selector) {
    var div = $(selector);

    if (div.length === 1) {
        div.empty();
        div.append(contents);
    }
};

// Get SVG string from textarea with given id
// Parse as XML and convert to jQuery object
function loadSVG(id) {
    var svgStringOld = $('#input-svg').val()
    var svgDoc = stringToXML(svgStringOld);

    if (!svgDoc) { return; }

    var jQuerySVG = $(svgDoc).children();
    var svgObj = new SVG_Object(jQuerySVG[0]);

    // Output a nicely formatted file
    //svgObj.options.whitespace = 'pretty';

    // Remove ids
    svgObj.options.removeIDs = true;

    // Create the new SVG string
    var svgStringNew = svgObj.toString();

    // Add SVG images
    addContentsToDiv(svgStringOld, '#svg-before .svg-container');
    addContentsToDiv(svgStringNew, '#svg-after .svg-container');

    // Add SVG information
    var filesizeOld = getFileSize(svgStringOld);
    var filesizeNew = getFileSize(svgStringNew);
    var numElementslOld = jQuerySVG.find("*").length;

    var compression = Math.round(1000 * svgStringNew.length / svgStringOld.length) / 10;
    addContentsToDiv($("<p>Original filesize: " + filesizeOld + "</p>"), '#svg-before .svg-data-container');
    addContentsToDiv($("<p>New filesize: " + filesizeNew + " (" + compression + "%)</p>"), '#svg-after .svg-data-container');

    // Update interface
    $('#upload-container').hide("fast");
    $('#input-svg').val(svgObj);
    $('#output-section').show();
    $('#optimise-section').show();

    // Show code of updated SVG
    $('#output-container').text(svgStringNew);
};

$(document).ready(function() {
    $('#upload-section > h2').click(function() {
        $('#upload-container').toggle('fast');
    });

    $('#output-section').hide();
    $('#optimise-section').hide();
});