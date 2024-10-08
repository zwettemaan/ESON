﻿//
// Pull in json2.js so we can make comparisons. This was downloaded from
//   https://github.com/douglascrockford/JSON-js
//

//@include "json2.js"
//@include "ESON.jsx"
//@include "ESONTests.jsx"

// When generating random objects for the benchmark, create a 
// mix of objects and arrays, and use this many subobjects on the 
// nested levels. For example BENCHMARK_NUM_ATTRS_BY_LEVEL = [5,2] will create an 
// object or array with 5 elements in the root, and each of those elements
// will be an object or array with 2 elements. More entries in 
// BENCHMARK_NUM_ATTRS_BY_LEVEL result in more deeply nested constructs.

var BENCHMARK_NUM_ATTRS_BY_LEVEL = [ 5, 2, 2 ];

// Repeat the benchmark this many times
var BENCHMARK_LOOP_COUNT = 100;

// Set this to false and the generated strings will have characters in the range \u0020-\u00ff
// Set this to true and the generated strings will have characters in the range \u0020-BENCHMARK_MAX_HIGH_UNICODE
var BENCHMARK_GENERATE_HIGH_UNICODE = true;

// Avoid FEFF - that's a BOM mark
var BENCHMARK_MAX_HIGH_UNICODE = 0xFEFE;

// When creating random strings, use up to this many characters.
// Very high values make this script _very_ slow, probably because it 
// spends an inordinate amount in garbage collection

var BENCHMARK_MAX_STRING_LENGTH = 10 * 1024;

benchmark();

function benchmark() {
    
    var options = {
        maxStringLength: BENCHMARK_MAX_STRING_LENGTH,
        minCharCode: 32
    };

    if (BENCHMARK_GENERATE_HIGH_UNICODE) {
        options.maxCharCode = BENCHMARK_MAX_HIGH_UNICODE;
    }
    else {
        options.maxCharCode = 255;
    }

    if (! BENCHMARK_GENERATE_HIGH_UNICODE && ! ESON.ENCODE_BAD_UNICODE) {
        options.ignoreHighUnicode = true;
    }

    var totalTimeESONStringifyMicroseconds = 0;
    var totalTimeJSONStringifyMicroseconds = 0;
    var totalTimeESONParseESONMicroseconds = 0;
    var totalTimeESONParseJSONMicroseconds = 0;
    var totalTimeJSONParseJSONMicroseconds = 0;
    var totalTimeJSONParseESONMicroseconds = 0;
    var totalTimeInGarbageCollectionMicroseconds = 0;

    var totalLengthDifference = 0;

    for (var loop = 0; loop < BENCHMARK_LOOP_COUNT; loop++) {

        var o = ESON.generateObject(BENCHMARK_NUM_ATTRS_BY_LEVEL, options);

        $.hiresTimer; // reset timer, throw away previous reading
        
        try {
            var sESON = ESON.stringify(o, options);
            totalTimeESONStringifyMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("ESON.stringify throws " + err);
        }
                
        try {
            var sJSON = JSON.stringify(o);
            totalTimeJSONStringifyMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("JSON.stringify throws " + err);
        }

        totalLengthDifference += sESON.length - sJSON.length;

        var oESON;
        var oJSON;
        
        try {
            oESON = ESON.parse(sESON);
            totalTimeESONParseESONMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("ESON.parse of ESON.stringify throws " + err);
        }
                
        if (loop == 0 && ! ESON.isEquivalentObject(o, oESON)) {
            ESON.message("Mismatch between ESON parsed by ESON and original");
            //ESON.message(sESON);
        }

        try {
            oJSON = JSON.parse(sJSON);
            totalTimeJSONParseJSONMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("JSON.parse of JSON.stringify throws " + err);
        }

        if (loop == 0 && ! ESON.isEquivalentObject(o, oJSON)) {
            ESON.message("Mismatch between JSON2 parsed by JSON and original");
            //ESON.message(sJSON);
        }
    
        // Swap 'em around

        try {
            oESON = ESON.parse(sJSON);
            totalTimeESONParseJSONMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("ESON.parse of JSON.stringify throws " + err);
        }

        if (loop == 0 && ! ESON.isEquivalentObject(o, oESON)) {
            ESON.message("Mismatch between JSON2 parsed by ESON and original");
            //ESON.message(sESON);
        }

        try {
            oJSON = JSON.parse(sESON);
            totalTimeJSONParseESONMicroseconds += $.hiresTimer;
        }
        catch (err) {
            ESON.message("JSON.parse of ESON.stringify throws " + err);
        }

        if (loop == 0 && ! ESON.isEquivalentObject(o, oJSON)) {
            ESON.message("Mismatch between ESON parsed by JSON2 and original");
            //ESON.message(sJSON);
        }

        // We keep the time needed for garbage collection out of the benchmark
        // Free up memory, and collect garbage

        $.hiresTimer;

        oESON = undefined;
        sESON = undefined;
        oJSON = undefined;
        sJSON = undefined;
        $.gc();

        totalTimeInGarbageCollectionMicroseconds += $.hiresTimer;
    }

    if (totalLengthDifference <= 0) {
        ESON.message("ESON char count is on average less than JSON by:" + (-totalLengthDifference / BENCHMARK_LOOP_COUNT));
    }
    else {
        ESON.message("JSON char count is on average less than ESON by:" + (-totalLengthDifference / BENCHMARK_LOOP_COUNT));
    }
    ESON.message("Total Time (s) ESON Stringify:        " + totalTimeESONStringifyMicroseconds/1000/1000);
    ESON.message("Total Time (s) JSON Stringify:        " + totalTimeJSONStringifyMicroseconds/1000/1000);
    ESON.message("Total Time (s) ESON Parse ESON:       " + totalTimeESONParseESONMicroseconds/1000/1000);
    ESON.message("Total Time (s) ESON Parse JSON:       " + totalTimeESONParseJSONMicroseconds/1000/1000);
    ESON.message("Total Time (s) JSON Parse ESON:       " + totalTimeJSONParseESONMicroseconds/1000/1000);
    ESON.message("Total Time (s) JSON Parse JSON:       " + totalTimeJSONParseJSONMicroseconds/1000/1000);
    ESON.message("Total Time (s) In Garbage Collection: " + totalTimeInGarbageCollectionMicroseconds/1000/1000);
}
