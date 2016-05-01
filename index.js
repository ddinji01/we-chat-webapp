var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL 
    || 'mongodb://heroku_18vgwk1v:v4jjv9dnf3qvsrtk6k5atd1g06@ds021689.mlab.com:21689/heroku_18vgwk1v' || 
    'mongodb://localhost';

var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
    if (!error) {
        console.log("You are connected to mongodb");
        db = databaseConnection;
        db.collection('landmarks').createIndex({'geometry':"2dsphere"});
    }
});

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
    	next();
    }
};

	app.use(allowCrossDomain);
	app.use(express.static(__dirname + '/public'));

app.set('port', (process.env.PORT || 5000));
// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.post('/sendLocation', function(request, response) {
    var login = request.body.login;
    var lat = parseFloat(request.body.lat);
    var lng = parseFloat(request.body.lng);
    var checkin_time = Date();

    if (login == undefined || lat == undefined || lng == undefined) { //make sure the fields exist
        response.send('{"error":"Whoops, something is wrong with your data!"}');
    } else {
        
        var toInsert = {
            "login": login,
            "lat": lat,
            "lng": lng,
            "created_at": checkin_time
        }
        db.collection('checkins', function(error, coll) {
            coll.insert(toInsert, function(error, saved) {
                if (error) {
                    response.sendStatus(500);
                } else {
                    var JSON_response = {};
                    db.collection('landmarks', function(er, collection) {
                        collection.find({geometry:{$near:{$geometry:{type:"Point",coordinates:
                                    [lng,lat]},$minDistance: 1000,$maxDistance: 1500}}})
                                    .toArray(function(err, cursor) {
                            if (err) {
                                response.sendStatus(500);
                            } else {
                                JSON_response.landmarks = [];
                                for (var count = 0; count < cursor.length; count++) {
                                    var landmark = {
                                        "_id":cursor[count]._id,
                                        "type":cursor[count].type,
                                        "geometry":cursor[count].geometry,
                                        "properties":cursor[count].properties
                                    }
                                    JSON_response.landmarks.push(landmark);
                                }
                            }
                            db.collection('checkins', function(er, collection) {
                                collection.find().toArray(function(err, cursor) {
                                    if (err) {
                                        response.sendStatus(500);
                                    } else {
                                        JSON_response.people = [];
                                        for (var count = 0; count < cursor.length; count++) {
                                            var person = {
                                                "login":cursor[count].login,
                                                "lat":cursor[count].lat,
                                                "lng":cursor[count].lng
                                            };
                                            JSON_response.people.push(person);
                                        }
                                        response.send(JSON_response);
                                    }
                                });
                            });
                        });
                    });
                }
            });
        });
    }
});

app.get('/checkins.json', function(request, response) {
    var login = request.query.login;
    if (login == "" || login == undefined) {
        var JSON_response = {};
    	response.send(JSON_response);
    } else {
        db.collection('checkins', function(er, collection) {
            collection.find().toArray(function(err, cursor) {
                if (err) {
                    response.sendStatus(500);
                } else {
    		    var JSON_response = "";
                    for (var count = 0; count < cursor.length; count++) {
                        var person = {
                            "login":cursor[count].login,
                            "lat":cursor[count].lat,
                            "lng":cursor[count].lng,
                            "created_at":cursor[count].created_at
                        };
                        if(person.login == login) {
			    JSON_response += JSON.stringify(person);
                        }
                    }
                    response.send(JSON_response);
                }
            });
        });
    }
});

app.get('/', function(request, response) {
    response.set('Content-Type', 'text/html');
    var indexPage = '';
    db.collection('checkins', function(er, collection) {
        collection.find().toArray(function(err, cursor) {
            if (!err) {
                for (var count = 0; count < cursor.length; count++) {
                    indexPage = "<p>" + cursor[count].login + " checked in at " + (cursor[count].lat).toString()
                    + ", " + (cursor[count].lng).toString() + " on " + cursor[count].created_at + "</p>" + indexPage;
                }
                indexPage = "<!DOCTYPE HTML><html><head><title>Checkin report</title></head><body><h1>Checkin report</h1>" + indexPage + "</body></html>";
                response.send(indexPage);
            } else {
                response.send('<!DOCTYPE HTML><html><head><title>Checkin report</title></head><body><h1>Whoops, something went terribly wrong!</h1></body></html>');
            }
        });
    });
});

app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});
