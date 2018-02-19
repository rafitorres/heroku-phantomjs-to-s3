var page = require('webpage').create(),
    system = require('system'),
    address, output, size, format;

if (system.args.length < 3 || system.args.length > 5) {
  console.log('Usage: rasterize.js URL filename [paperwidth*paperheight|paperformat]');
  console.log('  image (png/jpg output) examples: "1920px" entire page, window width 1920px');
  console.log('                                   "800px*600px" window, clipped to 800x600');
  phantom.exit(1);
} else {
  address = system.args[1];
  output = system.args[2];
  format = system.args[4];
  page.viewportSize = { width: 600, height: 600 };
  if (system.args[3].substr(-2) === "px") {
    size = system.args[3].split('*');
    if (size.length === 2) {
      pageWidth = parseInt(size[0], 10);
      pageHeight = parseInt(size[1], 10);
      page.viewportSize = { width: pageWidth, height: pageHeight };
      page.clipRect = { top: 0, left: 0, width: pageWidth, height: pageHeight };
    } else {
      pageWidth = parseInt(system.args[3], 10);
      pageHeight = parseInt(pageWidth * 3/4, 10); // it's as good an assumption as any
      page.viewportSize = { width: pageWidth, height: pageHeight };
    }
  }

  var renderAndExit = function(){
    console.log("Rendering");
    page.render(output, {
      format: format,
      quality: '100'
    });
    phantom.exit();
  }

  page.onConsoleMessage = function(msg, lineNum, sourceId) {
    console.log('CONSOLE 1: ' + msg);
    if(msg == "Page loaded"){
      console.log("The page loaded - Time to render");
      renderAndExit();
    }
  };

  page.open(address, function (status) {
    if (status !== 'success') {
      console.log('Unable to load the address!');
      phantom.exit();
    } else {
      // if(window.document.readyState == "complete"){
      //   renderAndExit()
      // } else {
      //   window.addEventListener ?
      //   window.addEventListener("load", renderAndExit, false) :
      //   window.attachEvent && window.attachEvent("onload", renderAndExit);
      // }
    }
  });
}
