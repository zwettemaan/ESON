﻿// The script contains a testbed used for benchmarking and comparing JSON 
// vs the uneval/eval version in ESON. 
// 
// (c) 2024 Kris Coppieters - Rorohiko Ltd.
// 
// Based on my benchmarks, JSON.stringify is only occasionally slightly faster than ESON.stringify.
// ESON.parse is a fair bit faster than JSON.parse. 
// ESON.stringify also seems to produce slightly more compact JSON.
// Finally, if you are 100% sure that the Unicode chars \u000a, \u000d, \u2028 and \u2029 don't appear in the
// data, you can set options.dontLookForBadUnicode true and then ESON.stringify becomes MUCH faster.
//
// Do NOT use ESON.parse on unfiltered input of unknown origin: ESON.parse is insecure
// and can be subverted by injection attacks, and you should only use it on strings 
// from a trustworthy source. 
//
// Sample benchmark obtained from InDesign Server:
//
// ESON is on average shorter than JSON by:655.25
// Total Time (s) ESON Stringify:        0.769152
// Total Time (s) JSON Stringify:        1.113911
// Total Time (s) ESON Parse ESON:       1.08657
// Total Time (s) ESON Parse JSON:       1.217208
// Total Time (s) JSON Parse ESON:       5.425569
// Total Time (s) JSON Parse JSON:       5.201757
// Total Time (s) In Garbage Collection: 0.086987
//

if ("undefined" == typeof ESON) {
    ESON = {};
}

(function() {

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
                defaultMaxCharCode = 0xFEFE;
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
    if (minCharCode === undefined) {
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
    
    var retVal = false;
    
    do {
        if (o1 === o2) {
            retVal = true;
            break;
        }

        var to1 = typeof o1;
        var to2 = typeof o2;
        if (to1 != to2) {
            break;
        }

        if ("number" == to1) {
            if (isNaN(o1) && isNaN(o2)) {
                retVal = true;
                break;
            }

            if (isNaN(o1) || isNaN(o2)) {
                break;
            }
        
            var diff = Math.abs(o1 - o2);
            var relativeDiff = diff/(Math.abs(o1) + Math.abs(o2));
            if (relativeDiff < 0.00001) {
                retVal = true;
                break;
            }
        
            break;
                    
        }

        if ("object" == to1) {
            
            if (o1 instanceof Array) {
                if (! (o2 instanceof Array)) {
                    break;
                }
                if (o1.length != o2.length) {
                    break;
                }
                var idx = 0;
                while (idx < o1.length) {
                    if (! isEquivalentObject(o1[idx], o2[idx])) {
                        break;
                    }
                    idx++;
                }
                retVal = true;
                break;
            }
        
            for (var attr in o1) {
                if (! (attr in o2)) {
                    break;
                }
            }
            for (var attr in o2) {
                if (! (attr in o1)) {
                    break;
                }
                else if (! isEquivalentObject(o1[attr],o2[attr])) {
                    break;
                }
            }
        
            retVal = true;
            break;
        }
    
    }
    while (false);
    
    return retVal;
}

function shallowCloneOptions(options) {
    var retVal = {};
    for (var attr in options) {
        retVal[attr] = options[attr];
    }
    return retVal;
}

})();
