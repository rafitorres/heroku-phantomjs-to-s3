/**
 * @module Renderer
 *
 * @fileOverview
 * Some description…
 */

var childProcess = require('child_process');

// Modules
var sisuClient = require('./sisu_api/client');
var storage = require('./modules/services/upload');

function orderObject(request_body){
  var filename = request_body.filename + "." + file_type;
  var parent_dir = "./" + request_body.aws_directory.split("/")[0];
  var filenameFull = "./" + request_body.aws_directory + "/" + filename;
  console.log(new Date().toISOString(), ": Filename -> ", filenameFull);
  var canvas_url = process.env.SISU_API_URL + "/render/prints/" + request_body.order_id + "?render_token=" + process.env.SISU_RENDER_TOKEN;

  var orderObject = {
    id: request_body.order_id,
    filename: filename,
    filenameFull: filenameFull,
    awsDirectory: request_body.aws_directory,
    redirect: request_body.redirect
  };

  return orderObject;
}

function renderImage() {
  // Begin the processing
  var orderObject = orderObject();

  var childArgs = [
    'rasterize.js',
    orderObject.canvas_url,
    orderObject.filenameFull,
    request.body.size? request.body.size : '',
    request.body.file_type? request.body.file_type : 'jpg',
  ];

  //grap the screen
  var phantomProcess = childProcess.spawn('phantomjs', childArgs, {
    stdio: 'inherit'
  });

  phantomProcess.on('error', function(code) {
    console.log(new Date().toISOString(), "Error capturing page: " + error.message + "\n for address: " + childArgs[1]);
    rollbar.error(new Date().toISOString(), "Error capturing page: " + error.message + "\n for address: " + childArgs[1]);

    return response.status(500).json({
      'error': 'Problem capturing page.'
    });
  });

  phantomProcess.on('exit', function(code) {
    console.log(new Date().toISOString(), ': Phantom process exited with code ' + code.toString())
    // Upload to S3
    var order = this.spawnargs[this.spawnargs.length - 1]
    storage.upload(request.body);
  });
}

exports.renderImage = renderImage;
