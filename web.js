require('dotenv').config({silent: true});

var express = require('express');
const sisuClient = require('./sisu_api/client');

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

var childProcess = require('child_process');
var guid = require('guid');
var AWS = require('aws-sdk');
var fs = require('fs');
var apiRequest = require("request");
var rimraf = require('rimraf');

var s3 = new AWS.S3({region: process.env.AWS_REGION});
var file_types = ['jpg', 'png'];

var app = express();


app.use(express.bodyParser());
app.use(rollbar.errorHandler());

app.get('/', function(req, res){
  res.send('<html><head><title>Screenshots!</title></head><body><h1>Screenshots!</h1><form action="/render" method="POST">URL: <input name="order_id" value="" placeholder="http://"><br>Size:<input name="size" value="" placeholder="1024px or 1024px*1000px"><br><input type="hidden" name="redirect" value="true"><input type="submit" value="Get Screenshot!"></form></body></html>');
});

app.post('/v1/render', function(request, response) {
  if(process.env.SISU_RENDERER_ACCESS_TOKEN){
    if(!request.body.access_token || request.body.access_token != process.env.SISU_RENDERER_ACCESS_TOKEN){
      return response.json(401, { 'unauthorized': ' _|_ ' });
    }
  }

  var file_type = request.body.file_type;
  if (file_types.indexOf(file_type) === -1){
    return response.json(500, {
      'error': 'call /render/[file_type] where file_type is either jpg or png'
    });
  }

  if(!request.body.filename) {
    return response.json(400, { 'error': 'You need to provide a filename.' });
  }

  if(!request.body.aws_directory) {
    return response.json(400, { 'error': 'You need to provide an AWS location for the print.' });
  }

  if(!request.body.order_id) {
    return response.json(400, { 'error': 'You need to provide an order id.' });
  }

  // Respond as quickly as possible
  // to say we're handling this request
  response.json(200, {
    'status': "OK"
  });

  var filename = request.body.filename + "." + file_type;
  var parent_dir = "./" + request.body.aws_directory.split("/")[0];
  var filenameFull = "./" + request.body.aws_directory + "/" + filename;
  console.log(new Date().toISOString(), ": Filename -> ", filenameFull);
  var canvas_url = process.env.SISU_API_URL + "/render/prints/" + request.body.order_id;
  var childArgs = [
    'rasterize.js',
    canvas_url,
    filenameFull,
    request.body.size? request.body.size : '',
    request.body.file_type? request.body.file_type : 'jpg'
  ];

  var uploadToS3 = function(){
    fs.readFile(filenameFull, function(err, temp_png_data){
      if(err != null){
        console.log(new Date().toISOString(), ": Error loading saved screenshot: " + err.message);
        rollbar.error(new Date().toISOString(), ": Error loading saved screenshot: " + err.message);

        return response.json(500, {
          'error': 'Problem loading saved page.'
        });
      } else {
        console.log(new Date().toISOString(), ": Uploading to s3 (#" + request.body.order_id + ")");

        upload_params = {
          Body: temp_png_data,
          Key: request.body.aws_directory + "/" + filename,
          ACL: "public-read",
          Bucket: process.env.AWS_BUCKET_NAME
        };

        //start uploading
        s3.putObject(upload_params, function(err, s3_data) {
          console.log(new Date().toISOString(), ": S3 (#" + request.body.order_id + "): ", err);
          if(err != null){
            console.log(new Date().toISOString(), ": Error uploading to s3: " + err.message);
            rollbar.error(new Date().toISOString(), ": Error uploading to s3: " + err.message);

            return response.json(500, {
              'error': 'Problem uploading to S3.' + err.message
            });
          } else {
            //clean up and respond
            rimraf(parent_dir, function () {
              console.log(new Date().toISOString(), ': Done');
            });

            var s3Region = process.env.AWS_REGION? 's3-' + process.env.AWS_REGION : 's3'
            var s3Url = 'https://' + process.env.AWS_BUCKET_NAME + '.' + s3Region + ".amazonaws.com/" + upload_params.Key;

            console.log(new Date().toISOString(), ": Uploaded to s3!");
            console.log(new Date().toISOString(), ": URL => ", s3Url);

            // Upload complete
            if (request.body.redirect == 'true') {
              return response.redirect(302, s3Url);
            } else {
              // Send a request back to Sisu.
              sisuClient.sisuOrderPut(request.body.order_id, {
                print_url: s3Url
              });
            }
          }
        });
      }
    });
  }

  //grap the screen
  var phantomProcess = childProcess.spawn('phantomjs', childArgs, { stdio: 'inherit' });

  phantomProcess.on('error', function(code) {
    console.log(new Date().toISOString(), "Error capturing page: " + error.message + "\n for address: " + childArgs[1]);
    rollbar.error(new Date().toISOString(), "Error capturing page: " + error.message + "\n for address: " + childArgs[1]);

    return response.json(500, {
      'error': 'Problem capturing page.'
    });
  });

  phantomProcess.on('exit', function(code) {
    console.log(new Date().toISOString(), ': Phantom process exited with code ' + code.toString())
    //load the saved file
    uploadToS3();
  });
});


var port = process.env.PORT || 8000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
