// Requires
var phantom = require('phantom');
var fs = require('fs');
// global array of active phantom instances
var phantomChildren = [];
var maxInstances = 4; //change this to run more phantom instances in parallel
var maxIterations = 20; // the max of websites to run through a phantom instance before creating a new one

// Object for crawling websites
function CrawlObject(phantomInstance, renderRequest) {
  var filename = renderRequest.filename + "." + renderRequest.fileType;
  var localDir = "./images/" + renderRequest.remoteDir.split("/")[0];
  var filenameAndDir = "./images/" + renderRequest.remoteDir + "/" + filename;
  var canvasUrl = process.env.SISU_API_URL + "/render/prints/" + renderRequest.orderId + "?render_token=" + process.env.SISU_RENDER_TOKEN;

  return {
    printObject: {
      filename: filename,
      localDir: localDir,
      filenameAndDir: filenameAndDir,
      canvasUrl: canvasUrl
    },
    processId: phantomInstance.process.pid, // process id of the child process
    phantomInstance: phantomInstance,
    viewportSize: {
      width: 3508,
      height: 4961
    }, // viewport of the phantom browser
    format: {
      format: 'jpg'
    }, // format for the image
    timeOut: 5000 //Max time to wait for a website to load
  }
}

// create browser instance
function initPhantom(renderRequest) {
  //only allow 4 instances at once
  if (checkPhantomStatus() == true) {
    phantom.create(['--ignore-ssl-errors=no', '--load-images=true'], {logLevel: 'error'})
      .then(function (instance) {
        console.log("===================> PhantomJs instance: ", instance.process.pid);
        // store the process id in an array
        phantomChildren.push(instance.process.pid);
        var crawlObject = new CrawlObject(instance, renderRequest);
        createWebsiteScreenshots(crawlObject);
        return true;
      }).catch(function (e) {
      console.log('Error in initPhantom', e);
    });
  }
  return checkPhantomStatus();
}

// create a tab and make screenshot
function createWebsiteScreenshots(crawl) {
  var website = crawl.websites[crawl.index];
  var user_folder = 'public/images/' + crawl.crawlStatus.user;
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
      page.property('viewportSize', crawl.viewportSize);
      return page.open(website);
    })
    // get HTML content if you want to work with it
    .then(function () {
      // use a delay to make sure page is rendered properly
      return delay(crawl.timeOut).then(function () {
        return page.property('content');
      })
    })
    //render website to png file
    .then(function (content) {
      console.log("render %s / %s", crawl.index + 1, crawl.websites.length, "processId:", crawl.processId);
      var image = user_folder + "/" + new Date().toString() + "." + crawl.format.format;
      return page.render(image, crawl.format);
    })
    // close tab and continue with loop
    .then(function () {
      page.close();
      continuePhantomLoop(crawl);
    })
    .catch(function (e) {
      restartPhantom(crawl, e);
    });
}

// delay function which returns a promise
function delay(t) {
  return new Promise(function (resolve) {
    setTimeout(resolve, t)
  });
}

// check status and continue
function continuePhantomLoop(crawl) {
  //if there are still items left to crawl do it again
  if (crawl.index < crawl.websites.length - 1) {
    crawl.index += 1;
    createWebsiteScreenshots(crawl);
  } else {
    console.log("===================> all done: %s files has been written", crawl.websites.length, "processId:", crawl.processId);
    removeFromArray(crawl.processId);
    crawl.phantomInstance.exit();
  }
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
  crawl.websites = crawl.websites.slice(crawl.index);
  initPhantom(crawl.websites, crawl.crawlStatus);
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
  startCrawler: initPhantom,
  phantomChildren: phantomChildren
};
