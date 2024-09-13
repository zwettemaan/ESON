var IS_SERVER = "serverSettings" in app;

message("Testing a few Unicode chars. There are two 'bad' codes that we need to contend with: \\u2028 and \\u2029");

// All is well from 0x0020 upwards, till we come to...

tryCode(0x2027);
tryCode(0x2028);
tryCode(0x2029);
tryCode(0x202A);

//... and everything else is OK

message("Done");

function tryCode(unicode) {
    try {
        $.writeln("Trying \\u" + unicode.toString(16));
        
        // s1 is a string - a letter 'a' followed by a high-unicode char followed by a letter 'b'
        // The letters I picked have no bearing on this test.
        
        var s1 = "a" + String.fromCharCode(unicode) + "b";
        
        // Round trip the string through uneval and eval
        var s2 = eval(uneval(s1));
        
        $.writeln("Succeeded \\u" + unicode.toString(16));
    }
    catch (err) {
        $.writeln("failed \\u" + unicode.toString(16) + ", throws " + err);
    }
}

function message(s) {
    if (IS_SERVER) {
        alert(s);
    }
    else {
        $.writeln(s);
    }
}

