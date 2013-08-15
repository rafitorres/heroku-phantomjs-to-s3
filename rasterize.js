var page = require('webpage').create();
var system = require('system');

if (system.args.length < 3) {
    console.log('Usage: rasterize.js URL filename');
    phantom.exit(1);
} else {
    var address = system.args[1];
    var output = system.args[2];

    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the address!');
            phantom.exit();
        } else {
            window.setTimeout(function () {
                page.render(output);
                phantom.exit();
            }, 200);
        }
    });
}
