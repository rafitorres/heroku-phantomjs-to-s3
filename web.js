require('dotenv').config();

var express = require('express');

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

var childProcess = require('child_process');
var guid = require('guid');
var AWS = require('aws-sdk');
var fs = require('fs');
var s3 = new AWS.S3({region: process.env.AWS_REGION});

var app = express();
app.use(express.bodyParser());
app.use(rollbar.errorHandler());

app.get('/', function(req, res){
  res.send('<html><head><title>Screenshots!</title></head><body><h1>Screenshots!</h1><form action="/screenshot" method="POST">URL: <input name="address" value="" placeholder="http://"><br>Size:<input name="size" value="" placeholder="1024px or 1024px*1000px"><br>Zoom factor:<input name="zoom" value="1"><br><input type="hidden" name="redirect" value="true"><input type="submit" value="Get Screenshot!"></form></body></html>');
});

app.post('/screenshot', function(request, response) {
  if(process.env.PASSCODE){
    if(!request.body.passcode || request.body.passcode != process.env.PASSCODE){
      return response.json(401, { 'unauthorized': ' _|_ ' });
    }
  }

  if(!request.body.address) {
    return response.json(400, { 'error': 'You need to provide the website address.' });
  }

  var filename = guid.raw() + '.png';
  var filenameFull = './images/' + filename;
  var childArgs = [
    'rasterize.js',
    format(request.body.address),
    filenameFull,
    request.body.size? request.body.size : '',
    request.body.zoom? request.body.zoom : 1
  ];

  //grap the screen
  childProcess.execFile('phantomjs', childArgs, function(error, stdout, stderr){
    console.log("Grabbing screen for: " + request.body.address);

    if(error !== null) {
      console.log("Error capturing page: " + error.message + "\n for address: " + childArgs[1]);
      rollbar.error("Error capturing page: " + error.message + "\n for address: " + childArgs[1]);

      return response.json(500, { 'error': 'Problem capturing page.' });
    } else {
      //load the saved file
      fs.readFile(filenameFull, function(err, temp_png_data){
        if(err != null){
          console.log("Error loading saved screenshot: " + err.message);
          rollbar.error("Error loading saved screenshot: " + err.message);

          return response.json(500, { 'error': 'Problem loading saved page.' });
        }else{
          upload_params = {
            Body: temp_png_data,
            Key: guid.raw() + ".png",
            ACL: "public-read",
            Bucket: process.env.AWS_BUCKET_NAME
          };
          //start uploading
          s3.putObject(upload_params, function(err, s3_data) {
            if(err != null){
              console.log("Error uploading to s3: " + err.message);
              rollbar.error("Error uploading to s3: " + err.message);

              return response.json(500, { 'error': 'Problem uploading to S3.' + err.message });
            } else {
              //clean up and respond
              fs.unlink(filenameFull, function(err){}); //delete local file
              var s3Region = process.env.AWS_REGION? 's3-' + process.env.AWS_REGION : 's3'
              var s3Url = 'https://' + process.env.AWS_BUCKET_NAME + '.' + s3Region + ".amazonaws.com/" + upload_params.Key;

              if (request.body.redirect == 'true') {
                return response.redirect(302, s3Url);
              } else {
                return response.json(200, { 'url': s3Url });
              }
            }
          });
        }
      });
    }
  });
});


var port = process.env.PORT || 8000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

function format(url){
  if( url.indexOf("http") > -1 )
    return url;
  else
    return "http://" + url;
}
