var page = require('webpage').create();
var system = require('system');
var c = console;

if (system.args.length < 3) {
    console.log('Usage: rasterize.js URL filename');
    phantom.exit(1);
} else {
    var address = system.args[1];
    var output_file = system.args[2];

    page.viewportSize = { width:1920, height:1080 }
    page.open(address, function (status) {
        if (status !== 'success') {
            c.log('Unable to load the address!');
            phantom.exit();
        } else {
            if(window.document.readyState == "complete"){
                //TODO: add format, quality
                c.log("Rendering");
                page.render( output_file, { format:'png', quality:'100' } )
                phantom.exit();
            }else{
                window.onload = function () {
                    c.log("Rendering");
                    page.render( output_file, { format:'png', quality:'100' } )
                    phantom.exit();
                };
            }
        }
    });
}
