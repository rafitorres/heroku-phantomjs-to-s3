var express = require('express');
var childProcess = require('child_process');
var guid = require('guid');
var AWS = require('aws-sdk');
var fs = require('fs');
var s3 = new AWS.S3({region: process.env.AWS_REGION});

var app = express();
app.use(express.bodyParser());


app.post('/screenshot', function(request, response) {
  if(!request.body.address) {
    return response.json(400, { 'error': 'You need to provide the website address.' });
  }

  var filename = guid.raw() + '.png';
  var filenameFull = './images/' + filename;
  var childArgs = [
    'rasterize.js',
    request.body.address,
    filenameFull
  ];
  //grap the screen
  childProcess.execFile('phantomjs', childArgs, function(error, stdout, stderr){
    console.log("Grabbing screen for: " + request.body.address);
    if(error !== null) {
      console.log("Error capturing page: " + error.message + "\n for address: " + childArgs[1]);
      return response.json(500, { 'error': 'Problem capturing page.' });
    } else {
      //load the saved file
      fs.readFile(filenameFull, function(err, temp_png_data){
        if(err!=null){
          console.log("Error loading saved screenshot: " + err.message);
          return response.json(500, { 'error': 'Problem loading saved page.' });
        }else{
          upload_params = {
            Body: temp_png_data,
            Key: guid.raw() + ".png",
            ACL: "public-read",
            Bucket: process.env.AWS_BUCKET_NAME
          }
          //start uploading
          s3.putObject(upload_params, function(err, s3_data) {
            if(err!=null){
              console.log("Error uploading to s3: " + err.message);
              return response.json(500, { 'error': 'Problem uploading to S3.' + err.message });
            }else{
              //clean up and respond
              fs.unlink(filenameFull, function(err){}); //delete local file
              var s3Url = 'https://s3-' + process.env.AWS_REGION + ".amazonaws.com/" + process.env.AWS_BUCKET_NAME +
              '/' + upload_params.Key;
              return response.json(200, { 'url': s3Url });
            }
          });
        }
      });
    }
  });
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
