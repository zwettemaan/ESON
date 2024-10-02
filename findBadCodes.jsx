var IS_SERVER = "serverSettings" in app;

var badCodes = [];
for (var idx = 0; idx < 0xFEFF; idx++) {
    try {
        var s = "a" + String.fromCharCode(idx) + "b";
        var s1 = eval(uneval(s));
    }
    catch (err) {
        badCodes.push("\\u" + to4Hex(idx));
    }
}

// Will show \u000a, \u000d, \u2028, \u2029
message(badCodes);

function message(s) {
    if (IS_SERVER) {
        alert(s);
    }
    else {
        $.writeln(s);
    }
}

function to4Hex(i) {
    var s = ("000" + i.toString(16));
    return s.substring(s.length - 4);
 }
 