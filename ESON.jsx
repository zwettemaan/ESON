// This script contains an ExtendScript substitute function for json2.js
// The substitute is based on the built-in uneval/eval functions.
// 
// (c) 2024 Kris Coppieters - Rorohiko Ltd.
// 
// The script also contains a testbed used for benchmarking and comparing JSON 
// vs the uneval/eval versions. 
//
// Based on my benchmarks, JSON.stringify is occasionally slightly faster than ESON.stringify.
// ESON.parse is a fair bit faster than JSON.parse. 
// ESON.stringify also seems to produce slightly more compact JSON.
// Finally, if you are 100% sure that the Unicode chars \u2028 and \u2029 don't appear in the
// data, you can set options.ignoreHighUnicode true and then ESON.stringify becomes MUCH faster.
//
// Do NOT use ESON.parse on unfiltered input of unknown origin: ESON.parse is insecure
// and can be subverted by injection attacks, and you should only use it on strings 
// from a trustworthy source. 
//
// Sample benchmark obtained from InDesign Server:
//
// Fri Sep 13 17:07:22 2024 INFO   [server] ESON is on average shorter than JSON by:32.45
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) ESON Stringify:        0.201588
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) JSON Stringify:        0.220061
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) ESON Parse ESON:       0.0755
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) ESON Parse JSON:       0.084029
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) JSON Parse ESON:       0.704001
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) JSON Parse JSON:       0.638591
// Fri Sep 13 17:07:22 2024 INFO   [server] Total Time (s) In Garbage Collection: 0.016169
//

if ("undefined" == typeof ESON) {
    ESON = {};
}

(function() {

// Set this to false if you're sure the characters \u2028 and \u2029 NEVER EVER
// appear in the data. This speeds up ESON.stringify a fair bit.

ESON.ENCODE_BAD_UNICODE = true;

// eval() has a problem when it tries to evaluate a string that contains these
// Unicode characters. The ESON stringify will encode these two characters
// using \u2028 and \u2029 notation. Other Unicode characters are left unencoded.

ESON.REGEXP_FIND_BAD_UNICODE = /[\u2028\u2029]/g;

// Determine whether we're running on InDesign Server
ESON.IS_INDESIGN_SERVER = "serverSettings" in app;

ESON.DEFAULT_RANDOM_STRING_LENGTH = 256;

function generateAtom(options) {
    
    // Randomly create a 'thing' - a number, string, NaN, undefined, null...
    // By default, will not generate NaN or undefined, but can be 
    // reconfigured through the options

    if (! options) {
        options = {};
    }

    if (! options.maxStringLength) {
        options = shallowCloneOptions(options);
        options.maxStringLength = ESON.DEFAULT_RANDOM_STRING_LENGTH;
    }

    var retVal = undefined;
    var r = Math.random();
    if (r < 0.2) {
        retVal = Math.random();
    }
    else if (r < 0.3) {
        retVal = Math.floor(Math.random() * 1000);
    } 
    else if (r < 0.4 && options.allowNaN) {
        retVal = NaN;
    } 
    else if (r < 0.5 && options.allowUndefined) {
        retVal = undefined;
    } 
    else if (r < 0.6) {
        retVal = null;
    } 
    else if (r < 0.7) {
        retVal = Math.random() < 0.5;
    } 
    else {
        if (! options.minCharCode) {
            options = shallowCloneOptions(options);
            options.minCharCode = 32;
        }
        if (! options.maxCharCode) {
            var defaultMaxCharCode;
            if (r < 0.8) {
                defaultMaxCharCode = 127;
            }
            else if (r < 0.95) {
               defaultMaxCharCode = 255;
            }
            else {
                defaultMaxCharCode = 0xFEFF;
            }
            options = shallowCloneOptions(options);
            options.maxCharCode = defaultMaxCharCode;
        }
    
        var length = Math.floor(Math.random() * options.maxStringLength);

        retVal = generateString(length, options);
    }
     
   return retVal;
}
    
ESON.generateObject = function generateObject(numAttrsByLevel, options) {

    var retVal = {};
    
    if (! options) {
        options = {};        
    }

    if (! options.maxStringLength) {
        options = shallowCloneOptions(options);
        options.maxStringLength = 256;
    }

    if (! numAttrsByLevel || numAttrsByLevel.length == 0) {
        retVal = generateAtom(options);
    }
    else {
        var subNumAttrsByLevel = numAttrsByLevel.slice(1);
        if (Math.random() < 0.5) {
            retVal = [];
            for (var idx = 0; idx < numAttrsByLevel[0]; idx++) {
                retVal.push(generateObject(subNumAttrsByLevel, options));
            }
        }
        else {
            retVal = {};            
            for (var idx = 0; idx < numAttrsByLevel[0]; idx++) {
                var length = Math.floor(Math.random() * 10) + 1;
                var attr = generateString(length,{ minCharCode: 65, maxCharCode: 90});
                retVal[attr] = generateObject(subNumAttrsByLevel, options);
            }
        }
    }

    return retVal;
}

function generateString(stringLength, options) {

    if (! options) {
        options = {};
    }

    var minCharCode = options.minCharCode;
    if (! minCharCode) {
        minCharCode = 0x20;
    }

    var maxCharCode = options.maxCharCode;
    if (! maxCharCode) {
        maxCharCode = 0x7E;
    }

    var retVal = "";
    stringLength = stringLength ? stringLength : 0;
    for (var idx = 0; idx < stringLength; idx++) {
        retVal += String.fromCharCode(minCharCode + Math.floor(Math.random() * (maxCharCode - minCharCode + 1)));
    }

    return retVal;
}

ESON.isEquivalentObject = function isEquivalentObject(o1, o2) {
    
    if (o1 === o2) {
        return true;
    }
    if (isNaN(o1) && isNaN(o2)) {
        return true;
    }
    if (isNaN(o1) || isNaN(o2)) {
        return false;
    }
    var to1 = typeof o1;
    var to2 = typeof o2;
    if (to1 != to2) {
        return false;
    }
    if ("object" == to1) {
        if (o1 instanceof Array) {
            if (! (o2 instanceof Array)) {
                return false;
            }
            if (o1.length != o2.length) {
                return false;
            }
            var idx = 0;
            while (idx < o1.length) {
                if (! isEquivalentObject(o1[idx], o2[idx])) {
                    return false;
                }
                idx++;
            }
            return true;
        }
        else {            
            for (var attr in o1) {
                if (! (attr in o2)) {
                    return false;
                }
            }
            for (var attr in o2) {
                if (! (attr in o1)) {
                    return false;
                }
                else if (! isEquivalentObject(o1[attr],o2[attr])) {
                    return false;
                }
            }
            return true;
        }
    }
    
    return false;
}

ESON.message = function message(s) {
    if (ESON.IS_INDESIGN_SERVER) {
        alert(s);
    }
    else {
        $.writeln(s);
    }
}

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

ESON.stringify = function stringify(o, options, isNestedCall) {

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
                    s += stringify(o[idx], options, true);
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
                    s += stringify(attr, options, true) + ":" + stringify(o[attr], options, true);
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
    }

    if (! isNestedCall && ! options.ignoreHighUnicode) {

        // Some unicode characters cause eval() to go off the rails: U+2028, U+2029
        var match;
        var substitutions = [];

        // Reset regexp
        ESON.REGEXP_FIND_BAD_UNICODE.lastIndex = 0;

        while ((match = ESON.REGEXP_FIND_BAD_UNICODE.exec(s)) !== null) {
            substitutions.push([to4Hex(match[0].charCodeAt(0),4), match.index]);
        }

        if (substitutions.length) {
            var sChunks = [];
            var curPos = 0;
            for (substIdx = 0; substIdx < substitutions.length; substIdx++) {
                var substitution = substitutions[substIdx];
                sChunks.push(s.substring(curPos, substitution[1]));
                sChunks.push("\\u" + substitution[0]);
                curPos = substitution[1] + 1;
            }
            sChunks.push(s.substring(curPos));
            s = sChunks.join("");            
        }
    }

    return s;
}
    
function to4Hex(i) {
   var s = ("000" + i.toString(16));
   return s.substring(s.length - 4);
}

})();
