// Requires
var phantom = require('phantom');
var fs = require('fs');

// Custom Modules
var Storage = require("../modules/storage");
var SisuClient = require("../modules/sisu_client");

// global array of active phantom instances
var phantomChildren = [];
var maxInstances = 4; //change this to run more phantom instances in parallel
var maxIterations = 20; // the max of websites to run through a phantom instance before creating a new one

// Object for crawling websites
function PrintObject(renderRequest, phantomInstance, crawlStatus) {
  var filename = renderRequest.filename + "." + renderRequest.fileType;
  var remoteDir = renderRequest.remoteDir;
  var localDir = "./images/" + remoteDir.split("/")[0];
  var filenameAndDir = "./images/" + remoteDir + "/" + filename;
  var canvasUrl = process.env.SISU_API_URL + "/render/prints/" + renderRequest.orderId + "?render_token=" + process.env.SISU_RENDER_TOKEN;

  return {
    orderId: renderRequest.orderId,
    renderRequest: renderRequest,
    filename: filename,
    remoteDir: remoteDir,
    filenameAndDir: filenameAndDir,
    canvasUrl: canvasUrl,
    processId: phantomInstance.process.pid, // process id of the child process
    crawlStatus: crawlStatus,
    phantomInstance: phantomInstance,
    viewportSize: {
      width: 3508,
      height: 4961
    }, // viewport of the phantom browser
    format: renderRequest.fileType, // format for the image
    timeOut: 5000 //Max time to wait for a website to load
  }
}

// create browser instance
function initPhantom(renderRequest, crawlStatus) {
  //only allow 4 instances at once
  if (checkPhantomStatus() == true) {
    phantom.create(['--ignore-ssl-errors=no', '--load-images=true'], {logLevel: 'error'})
      .then(function (instance) {
        console.log("============> PhantomJs instance: ", instance.process.pid);
        // store the process id in an array
        phantomChildren.push(instance.process.pid);
        var crawlObject = new PrintObject(renderRequest, instance, crawlStatus);
        createPrintRender(crawlObject);
        return true;
      }).catch(function (e) {
      console.log('Error in initPhantom', e);
    });
  }
  return checkPhantomStatus();
}

// create a tab and make screenshot
function createPrintRender(crawl) {
  var printCanvasUrl = crawl.canvasUrl
  var checkIterations = crawl.index >= maxIterations;
  var page;

  // if a phantom instance is running for too long it tends to crash sometimes
  // so start a fresh one
  if (checkIterations) {
    crawl.phantomInstance.exit();
    return restartPhantom(crawl);
  }

  crawl.phantomInstance.createPage()
    //open page in a tab
    .then(function (tab) {
      page = tab;
      page.viewportSize = crawl.viewportSize;
      page.clipRect = {
        top: 0,
        left: 0,
        width: crawl.viewportSize.width,
        height: crawl.viewportSize.height
      };
      page.setting("resourceTimeout", crawl.resourceTimeout);

      // Instead of running a timeOut, we just listen
      // for a console message included on the website:
      // "Page loaded"
      // nb: could be deemed as flakey, but it's useful and works
      page.on('onConsoleMessage', function(msg, lineNum, sourceId) {
        // render website to png file
        console.log("============> Console Msg: ", msg);
        if(msg == "Page loaded"){
          console.log(
            "render %s / %s",
            printCanvasUrl,
            "processId:",
            crawl.processId
          );

          page.renderBase64(crawl.format)
            .then(function(base64){
              crawl.renderBase64 = base64;
              var remotUrl = Storage.upload(crawl);

              SisuClient.sisuOrderPut(crawl.orderId, {
                print_url: remotUrl
              });
            });

          // This releases the page memory
          // Ensures garbage collection
          // Docs: http://phantomjs.org/api/webpage/method/close.html
          page.close();
          removeFromArray(crawl.processId);
        }
      });

      // page.on('onResourceError', function(resourceError) {
      //   console.log("onResourceError: ", onResourceError);
      // });

      page.open(printCanvasUrl, {encoding: "utf8"});
    })
    .catch(function (e) {
      restartPhantom(crawl, e);
    });
}

// restart if there is an error or we need a fresh phantom instance
function restartPhantom(crawl, e) {
  if (e) {
    console.log("Phantom Error:", e);
    try {
      console.log("try to kill: ", crawl.processId);
      process.kill(crawl.processId);
    } catch (err) {
      //
    }
  }
  removeFromArray(crawl.processId);
  initPhantom(crawl.renderRequest, crawl.crawlStatus);
}

// remove the processID from array
function removeFromArray(pId) {
  var index = phantomChildren.indexOf(pId);
  phantomChildren.splice(index, 1);
}

// return true or false if there are too many phantoms running
function checkPhantomStatus() {
  if (phantomChildren.length < maxInstances) {
    return true;
  }
  return false;
}

//export function for routes
module.exports = {
  start: initPhantom,
  phantomChildren: phantomChildren
};
