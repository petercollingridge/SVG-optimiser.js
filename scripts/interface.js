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
function getFileSize(str) {
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

function addSVGStats(selector, filesize, numElements) {
    var div = $(selector);
    if (div.length === 1) {
        div.empty();
        var ul = $('<ul>');
        div.append(ul);
        ul.append($('<li>Filesize: ' + filesize + '</li>'));
        ul.append($('<li>Elements: ' + numElements + '</li>'));
    }
};

function optimiseSVG(svgObj) {
    // Create the new SVG string
    var svgStringNew = svgObj.toString();

    // Show new SVG image
    addContentsToDiv(svgStringNew, '#svg-after .svg-container');

    // Show SVG information
    var compression = Math.round(1000 * svgStringNew.length / svgObj.originalString.length) / 10;
    addSVGStats('#svg-after .svg-data', getFileSize(svgStringNew) + " (" + compression + "%)", svgObj.options.numElements);

    // Show code of updated SVG
    $('#output-container').text(svgStringNew);
};

function addOptions(svgObj) {
    var container = $('#options-container');
    container.empty();

    for (var option in svgObj.options) {
        var checkbox = $('<input type="checkbox" name="' + option + '"/>' + option +'<br/>');

        checkbox.change(function(evt) {
            svgObj.options[this.name] = !this.checked;
            optimiseSVG(svgObj);
        });
        container.append(checkbox);
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
    svgObj.originalString = svgStringOld;

    // Output a nicely formatted file
    //svgObj.options.whitespace = 'pretty';

    // Remove ids
    svgObj.options.removeIDs = true;

    // Add original SVG image
    addContentsToDiv(svgStringOld, '#svg-before .svg-container');
    addSVGStats('#svg-before .svg-data', getFileSize(svgStringOld), jQuerySVG.find("*").length);

    // Add new SVG image
    optimiseSVG(svgObj)

    // Update interface
    $('#upload-container').hide("fast");
    addOptions(svgObj);
    $('#output-section').show();
    $('#optimise-section').show();
};

$(document).ready(function() {
    $('#upload-section > h2').click(function() {
        $('#upload-container').toggle('fast');
    });

    $('#output-section').hide();
    $('#optimise-section').hide();
});