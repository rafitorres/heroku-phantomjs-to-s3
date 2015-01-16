var express = require('express');
var childProcess = require('child_process');
var guid = require('guid');
var s3 = require('s3');
var fs = require('fs');

var s3Client = s3.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION
});

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
  childProcess.execFile('phantomjs', childArgs, function(error, stdout, stderr){
    if(error !== null) {
      return response.json(500, { 'error': 'Problem capturing page.' });
    } else {
      var uploader = s3Client.upload(filenameFull, '/' + filename);
      uploader.on('error', function(err) {
        return response.json(500, { 'error': 'Problem uploading to S3.' });
      });
      uploader.on('end', function() {
        fs.unlink(filenameFull, function(err){
          var s3Url = 'https://' + process.env.AWS_BUCKET_NAME + '.s3.amazonaws.com/' + filename;
          return response.json(200, { 'url': s3Url });
        });
      });
    }
  });
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
