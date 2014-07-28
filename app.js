var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);


/// scrapper

var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var async = require('async');

app.get('/scrape', function (req, res) {

    var dramaList = [];
    var dramaDetail = [];

    var initialRun = function() {
        async.series([
            function getDramaList(callback) {
                url = 'http://www.koreandrama.org/?page_id=439';
                request(url, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var $ = cheerio.load(body);
                        var id, title, pageurl;

                        $('.really_simple_share').remove();

                        $('.entrytext a').each(function() {
                            var data = $(this);

                            title = data.text();
                            pageurl = data.attr('href');
                            var idPos = pageurl.lastIndexOf('=');
                            id = pageurl.substring(idPos + 1);
                            var json = { "id": id, "title": title, "pageurl": pageurl };
                            dramaList.push(json);

                            return (title !== '2011 MBC Drama Awards (Winners List)');
                        });
                        dramaList.pop(); // to get rid of the 2011 Awards entry
                        callback(false, dramaList);
                    } else {
                        throw error;
                    }
                });
            },
//            function expandSeries(callback){
//                var i = dramaList.length;
//                var needToExpand = [];
//                while (i--){
//                    if (isNaN(dramaList[i].id)){
//                        url = dramaList[i].pageurl;
//                        dramaList.splice(i, 1); //remove from array
//                        needToExpand.push(url);
//                    }
//                }
//
//                async.each(needToExpand, function(url, callback) {
//                    request(url, function(error, response, body) {
//                        if (!error && response.statusCode == 200) {
//                            var $ = cheerio.load(body);
//                            var id, title, pageurl;
//
//                            $('#content > .post  > h2 > a').each(function () {
//                                var data = $(this);
//
//                                title = data.text();
//                                pageurl = data.attr('href');
//                                var idPos = pageurl.lastIndexOf('=');
//                                id = pageurl.substring(idPos + 1);
//                                var json = { "id": id, "title": title, "pageurl": pageurl };
//                                dramaList.push(json);
//                            });
//                        }
//                        else {
//                            throw error;
//                        }
//                        callback(false, dramaList);
//                    });
//                }, function(err){
//                    if (err) {
//                        console.log(err);
//                    } else {
//                        callback(false, dramaList);
//                    }
//                });
//            },
            function getEachDrama(callback) {
                var test = dramaList.slice(0, 6);
                async.each(test, function(drama, callback) {
                    request(drama.pageurl, function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var $ = cheerio.load(body);
                            var id, title, pageurl, image, altTitle, synopsis, genre;

                            title = drama.title;
                            pageurl = drama.pageurl;
                            id = drama.id;
                            synopsis = $('.entrytext > p:nth-of-type(5)').text();

                            var desc = $('.entrytext > p:nth-of-type(2)').text();

                            var altName = 'Also known as: ';
                            var altStartLocation = desc.search(altName);

                            if (altStartLocation != -1) {

                            }

                            if (altStartLocation  == -1) {
                                altStartLocation = desc.search('Also known as :');
                                if (altStartLocation == -1) {
                                    altTitle = '';
                                }
                                else {
                                    var altSlice = desc.slice(altStartLocation + altName.length);
                                    var altEndLocation = altSlice.indexOf('\n');
                                    altTitle = altSlice.slice(0, altEndLocation);
                                }
                            } else {
                                var altSlice = desc.slice(altStartLocation + altName.length);
                                var altEndLocation = altSlice.indexOf('\n');
                                altTitle = altSlice.slice(0, altEndLocation);
                            }


                            var genreName = 'Genre: ';
                            var genreStartLocation = desc.search(genreName);
                            var genreSlice = desc.slice(genreStartLocation + genreName.length);
                            var genreEndLocation = genreSlice.indexOf('\n');

                            genre = genreSlice.slice(0, genreEndLocation).toLowerCase().split(', ');

                            var json = { "id": id, "title": title, "pageurl": pageurl,
                                "image": '', "altTitle": altTitle, "synopsis": synopsis, "genre": genre };
                            //console.log(json);
                            dramaDetail.push(json);
                        }
                        else {
                            throw error;
                        }
                        callback(false, dramaDetail);
                    });
                }, function(err){
                    if (err) {
                        console.log(err);
                    } else {
                        callback(false, dramaDetail);
                    }
                });
            }
        ], function(err, results){
            //console.log(dramaList);
            console.log('final: ' + dramaList.length);
            console.log('final: ' + dramaDetail.length);
            console.log(dramaDetail);
            res.end("hello world");
        });
    }

    initialRun();
    res.send(200);
});


app.listen('8081');

console.log('magic happens at port 8081');




/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


exports = module.exports = app;
