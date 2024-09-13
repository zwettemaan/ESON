var IS_SERVER = "serverSettings" in app;

var badCodes = [];
for (var idx = 32; idx < 0xFEFF; idx++) {
    try {
        var s = "a" + String.fromCharCode(idx) + "b";
        var s1 = eval(uneval(s));
    }
    catch (err) {
        badCodes.push("\\u" + idx.toString(16));
    }
}

// Will show \u2028, \u2029
message(badCodes);

function message(s) {
    if (IS_SERVER) {
        alert(s);
    }
    else {
        $.writeln(s);
    }
}
