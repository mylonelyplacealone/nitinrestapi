var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./models/user');

var port = process.env.PORT || 5000;

mongoose.connect(config.database);
app.set('superSecret', config.secret);

//Use body parser to extract values from POST and/or URL parameters
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

//Use morgan to log requests to console
app.use(morgan('dev'));

//Routes

// get an instance of the router for api routes
var apiRoutes = express.Router();

//TODO - route to authenticate user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res){
    //find the user
    User.findOne({name: req.body.name }, function(err, user){
        if (err) throw err;

        if(!user){
            res.json({success : false, message: 'Authentication failed. User not found.'});
        } else if(user){
            //check if password matches
            if(user.password != req.body.password){
                res.json({success : false, message: 'Authentication failed. Wrong password.'});
            }
            else{
                //User is found with correct password
                //create a token with only our given payload
                //we don't want to pass in the entire user since that has the password
                const payload = { admin: user.admin };

                var token = jwt.sign(payload, app.get('superSecret'),{
                    expiresIn:1440
                });

                // return the information including token as JSON
                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token,
                    user:user
                });
            }
        }

    })
});

// TODO: route middleware to verify a token
apiRoutes.use(function(req, res, next){
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token 
        || req.headers['x-access-token'];

    //Decode Token
    if(token){
        // verifies secret and checks 
        jwt.verify(token, app.get('superSecret'), function(err, decoded){
            if(err){
                return res.json({ 
                    success: false, 
                    message: 'Failed to authenticate token.' 
                });    
            } else{
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else{
        // if there is no token, return an error
        return res.status(403).send({
            success: false, 
            message: 'No token provided.' 
        });
    }
});

// /api
// route to show a random message (GET http://localhost:8080/api/)
// app.get('/', function(req, res){
apiRoutes.get('/', function(req, res){
    // res.send('Hellos! The API is at http://localhost:' + port + '/api');
    res.json({ message: 'Welcome to the coolest API on earth!'});
});

// /api/setup
// app.get('/setup', function(req, res){
apiRoutes.get('/setup', function(req, res){
    //Create sample user
    var newUser = new User({
        name: 'Nitin Bakade',
        password: 'password',
        role: 'Administrator',
        admin: true
    });

    //Save sample user
    newUser.save(function(err){
        if(err) {
            throw err;
        }

        console.log('User saved successfully');
        res.json({
            success : true,
            message: 'User Created Successfully.'
        });
    });
});

// /api/users
apiRoutes.get('/users', function(req, res){
    User.find({}, function(err, users){
        res.json(users);
    })
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

//Start the Server
app.listen(port);

console.log('Magic happens at http://localhost:' + port);