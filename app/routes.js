// Requires
var Renderer = require("./renderer");
var fs = require('fs');
var fileTypes = ['jpg', 'png'];

module.exports = function (app) {
    // api to post a request for a render
    app.post('/api/v1/render', function(request, response) {
      if(process.env.SISU_RENDERER_ACCESS_TOKEN){
        if(!request.body.access_token || request.body.access_token != process.env.SISU_RENDERER_ACCESS_TOKEN){
          return response.status(401).json({ 'unauthorized': ' _|_ ' });
        }
      }

      if(!request.body.order_id) {
        return response.status(400).json({
          'error': 'You need to provide an order id.'
        });
      }

      if(!request.body.filename) {
        return response.status(400).json({
          'error': 'You need to provide a filename.'
        });
      }

      if (fileTypes.indexOf(request.body.file_type) === -1){
        return response.status(500).json({
          'error': 'call /render/[fileType] where fileType is either jpg or png'
        });
      }

      if(!request.body.aws_directory) {
        return response.status(400).json({
          'error': 'You need to provide an AWS location for the print.'
        });
      }

      var renderRequest = {
        orderId: request.body.order_id,
        filename: request.body.filename,
        fileType: request.body.file_type,
        remoteDir: request.body.aws_directory
      };

      // return true if successful
      var runPhantomJs = Renderer.start(renderRequest);
      // response for the http request
      var renderAnswer;

      if (runPhantomJs == true) {
        response.status(200).json({
          'status': "Starting to render print: " + renderRequest.orderId
        });
      } else {
        response.status(503).json({
          'status': "Phantom JS is too busy. :( Please try later"
        });
      }
    });

    app.get("/api/v1/status", function (req, res) {
      var body = {
        phantom: Renderer.phantomChildren
      };
      res.send(body);
    })
};
