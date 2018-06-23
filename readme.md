PhantomJS-S3 Screenshot Renderer Web Service
============================================

This node.js web service takes a PNG screenshot of the specified URL and uploads it to an AWS S3 bucket. It uses [PhantomJS](http://phantomjs.org/) and [Shinichi Tomita's PhantomJS Buildpack for Heroku](http://github.com/stomita/heroku-buildpack-phantomjs.git).

Unlike similar packages, this one does not require separate Node/PhantomJS servers. Instead it spawns PhantomJS as a child process.

## Usage

Make a `post` request to `/screenshot` with the following params:
  - `address` Make sure to include `http://`
  - `size` Can be any size (w x h), eg: `600px*800px`, `1080px*720px`

## How to deploy to Heroku:


Create app and push:

    $ heroku create <app-name> --stack cedar --buildpack https://github.com/ddollar/heroku-buildpack-multi.git
    $ git push heroku master

Make sure paths are set correctly:

    $ heroku config
    LD_LIBRARY_PATH: /usr/local/lib:/usr/lib:/lib:/app/vendor/phantomjs/lib
    PATH:            /usr/local/bin:/usr/bin:/bin:/app/vendor/phantomjs/bin

Set AWS config vars:

    $ heroku config:add AWS_ACCESS_KEY_ID=<your_aws_key_id>
    $ heroku config:add AWS_SECRET_ACCESS_KEY=<your_aws_secret_access_key>
    $ heroku config:add AWS_BUCKET_NAME=<name_of_your_bucket>

Set NODE_ENV as recommended by Heroku:

    $ heroku config:set NODE_ENV=production

Scale as needed:

    $ heroku ps:scale web=<number_of_desired_dynos>


## Added by Pete
Heorku buildpacks: [Read here](https://devcenter.heroku.com/articles/using-multiple-buildpacks-for-an-app)

Buildpacks added:

    $ heroku buildpacks:add heroku/nodejs
    $ heroku buildpacks:add --index 1 https://github.com/stomita/heroku-buildpack-phantomjs


## Run locally
```javascript
nodemon server.js
```

### Versioning
For a later date: [API versioning](http://j-query.blogspot.co.uk/2013/01/versioned-apis-with-express.html)

### API
    $ curl --request POST \
      --url http://localhost:8000/v1/render \
      --header 'content-type: application/x-www-form-urlencoded' \
      --data 'canvas_url=http%3A%2F%2Flocalhost%3A5000%2Fprints%2F5182&size=500*1000px&access_token=969CukLEsir3k8F7gBM&format=png&filename=pete-roome&aws_directory=render%2Fuser-1'


### TODO

- Add format quality as param for API

### Generate API tokens
```ruby
rand(36**19).to_s(36)
```
