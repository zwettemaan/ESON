// This script contains an ExtendScript substitute function for json2.js
// The substitute is based on the built-in uneval/eval functions.
// 
// (c) 2024 Kris Coppieters - Rorohiko Ltd.
// 

if ("undefined" == typeof ESON) {
    ESON = {};
}

(function() {

// Set this to false if you're sure the characters \u000A, \u000D, \u2028 and \u2029 NEVER EVER
// appear in the data. This speeds up ESON.stringify a fair bit.

ESON.ENCODE_BAD_UNICODE = true;

// eval() has a problem when it tries to evaluate a string that contains these
// Unicode characters. The ESON stringify will encode these two characters
// using \u2028 and \u2029 notation. Other Unicode characters are left unencoded.
// We also weed out the control characters - e.g. CR and LF are also problematic
// \x00 is not a problem, but not explicity escaping it makes for possible head-scratchers

ESON.REGEXP_FIND_BAD_UNICODE = /[\x00\x0A\x0D\u2028\u2029]/g;

// Determine whether we're running on InDesign Server
ESON.IS_INDESIGN_SERVER = "serverSettings" in app;

function shallowCloneOptions(options) {
    var retVal = {};
    for (var attr in options) {
        retVal[attr] = options[attr];
    }
    return retVal;
}

ESON.parse = function parse(s) {

    var retVal;
    try {
        eval("retVal = " + s);
    }
    catch (err) {
        message("parse throws " + err);
        retVal = undefined;
    }

    return retVal;
}

ESON.stringify = function stringify(o, options) {

    var s;

    if (! options) {
        options = {};
    }

    if ("object" == typeof(o)) {
        if (o instanceof Array) {
            s = "[";
            for (var idx = 0; idx < o.length; idx++) {
                if (idx > 0) {
                    s += ","
                }
                if (o[idx] !== undefined) {
                    s += stringify(o[idx], options);
                }
            }
            s += "]";
        }
        else if (o === null) {
            s = "null";
        }
        else if (o === undefined) {
            s = "undefined";
        }
        else {
            s = "{";
            var counter = 0;
            for (var attr in o) {
                if (o[attr] !== undefined) {
                    if (counter > 0) {
                        s += ","
                    }
                    s += stringify(attr, options) + ":" + stringify(o[attr], options);
                    counter++;
                }
            }
            s += "}";
        }                        
    }
    else {
        s = uneval(o);
        var sLen = s.length;
        if (s.charAt(0) == '(' && s.charAt(sLen - 1) == ')') {
            s = s.substring(1, sLen - 1);
        }
    
        if (! options.dontLookForBadUnicode && ! options.ignoreHighUnicode && "string" == typeof(o)) {
            // Some unicode characters cause eval() to go off the rails: U+000A, U+000D, U+2028, U+2029
            var match;
            var substitutions = [];

            // Reset regexp
            ESON.REGEXP_FIND_BAD_UNICODE.lastIndex = 0;

            while ((match = ESON.REGEXP_FIND_BAD_UNICODE.exec(s)) !== null) {
                var charCode = match[0].charCodeAt(0);
                if (charCode < 256) {
                    var substitute = "\x" + to2Hex(charCode);
                }
                else {
                    var substitute = "\u" + to4Hex(charCode);
                }
                substitutions.push([substitute, match.index]);
            }

            if (substitutions.length) {
                var sChunks = [];
                var curPos = 0;
                for (substIdx = 0; substIdx < substitutions.length; substIdx++) {
                    var substitution = substitutions[substIdx];
                    sChunks.push(s.substring(curPos, substitution[1]));
                    sChunks.push(substitution[0]);
                    curPos = substitution[1] + 1;
                }
                sChunks.push(s.substring(curPos));
                s = sChunks.join("");            
            }
        }
    }

    return s;
}

function to2Hex(i) {
   var s = ("0" + i.toString(16));
   return s.substring(s.length - 2);
}

function to4Hex(i) {
   var s = ("000" + i.toString(16));
   return s.substring(s.length - 4);
}

})();
