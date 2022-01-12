////////////////////////////////////////////////////////////////////////////////
/////////////Setting up needed modules//////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const MongoDBStore = require('connect-mongo');
const { ObjectId } = require('bson');
const Order = require("./models/orderModel");
const User = require("./models/userModel");

////////////////////////////////////////////////////////////////////////////////
////////////Setting up session, express, and needed variables///////////////////
////////////////////////////////////////////////////////////////////////////////

const app = express();
const PORT = process.env.PORT || 3000;

//Sets up session
const store = new MongoDBStore({
    mongoUrl: 'mongodb://localhost/a4',
    collection: 'sessions'
});
store.on('error',(error)=>{console.log(error)});

app.set('view engine','pug');
app.use(express.static('views/public'));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.set("public/views");

//uses created session
app.use(session({
    name:'a4-session',
    secret:'123',
    cookie:{
        //max is one day
        maxAge: 1000*60*60*24
    },
    //sorting session store
    store:store,
    resave:true,
    saveUninitialized:false
}));

//log requests
app.use(function(req,res,next){
    console.log(`${req.method} for ${req.url}`);
    next();
});

//exposes session to all functions
function exposeSesion(req,res,next){
    if(req.session) res.locals.session = req.session;
    next();
}

////////////////////////////////////////////////////////////////////////////////
////////////Routers/////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
app.use(exposeSesion);
app.get(['/','/home'],(req,res)=>res.render('home'));

app.get('/register',(req,res)=> res.render('register'));
app.post('/register',createNewUser);

app.get('/login',(req,res)=> res.render('login'));
app.post('/login',login);

app.get('/logout',logout);

app.get('/users',getUsers,sendUsers);
app.get('/users/:id',getSingleUser,sendSingleUser);
app.post('/users/:id',changeUsersPrivacy);

app.get('/order/:id',getOrder,sendOrder);

app.post('/orders',addOrder);
app.get('/orders',function(req,res){
    //check if user is logged in before displaying order page
    if(!req.session.loggedin){
        res.status(403).send("Error you have to be logged in to do that");
		return;
    }
    else{
        res.render('orderform');
    }
});

////////////////////////////////////////////////////////////////////////////////  
////////////Router functions////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// 
//adds order to the user who ordered them
function addOrder(req,res,next){
    //create new order from schema and fill its variables with the given data
    let newOrder = new Order();
    newOrder.restaurantName = req.body.restaurantName;
    newOrder.subtotal = req.body.subtotal;
    newOrder.total = req.body.total;
    newOrder.fee = req.body.fee;
    newOrder.tax = req.body.tax;
    newOrder.orderItems = [];
    newOrder.userWhoOrdered = req.session.username;
    newOrder.userIdWhoOrdered = req.session.userID;

    //Adds all ordered items to created order schema
    for (const property in req.body.order) {
        newOrder.orderItems.push(req.body.order[property]);
    }

    newOrder.save(function(err,result){
        if (err) return res.status(500).send("The server has failed not the programmer");
    });

    //Adding the new order to the user who ordered history
    User.findByIdAndUpdate(req.session.userID,{$push: {orderHistory:newOrder._id}}, function(err, doc) {
        if(err) return res.status(500).send("Error updating order");
        return res.send('Succesfully saved.');
    });
}

//logs the user out and deletes its session data
function logout(req,res){
    req.session.destroy();
    delete res.locals.session;
    res.redirect(`/home`);
    return;
}

//Creates new user
function createNewUser(req,res,next){
    //if already loggin in given the user an error
    if(req.session.loggedin){
		res.status(200).send("Already logged in.");
		return;
	}

    //Create new user and populate it's data
    let newUser = new User();
    newUser.username = req.body.username;
    newUser.password = req.body.password;
    newUser.privacy = false;
    newUser.orderHistory = [];

    //Checks if username has already been taken if not saves the newly created user
    User.findOne({ 'username': req.body.username}, function (err, userResult) {
        if(userResult != null|| err){
            console.log("Error that user information is already taken");
            res.send('<script>alert("Error that login combination is invalid"); window.location.href = "/register"; </script>');
            return;
        }
        else{
            newUser.save(function(err,result){
                if (err) return res.status(500).send("The server has failed not the programmer");
                
                //Sets new session data
                req.session.loggedin = true;
                req.session.username = newUser.username;
                req.session.userID = result._id; 
                res.locals.session = req.session;
                
                //Redirects to newly created user's profile
                res.status(200).redirect('/users/'+result._id);
                return;
            });
        }
    });
}

//Changes the users privacy
function changeUsersPrivacy(req,res,next){

    //Checks if the user making a post request it the current session user
    if(req.params.id != req.session.userID){
        res.status(403).send("Error you do not have permission to do that");
        return;
    }
    else{
        //Sets what the new privacy should be saved as
        let newPrivacy = true;
        if(req.body.privacy == "false"){
            newPrivacy = false;
        }

        //Updates the given users privacy to the requested change
        User.findByIdAndUpdate(req.session.userID,{privacy:newPrivacy}, function(err, doc) {
            if(err) return res.status(500).send("Error updating privacy");
            return res.send('Succesfully saved.');
        });
    }
}

//Gets all users
function getUsers(req,res,next){

    //first checks if a query for name happened
    if(req.query.name != null){
        //if so search and return users the contain the give name
        User.find({privacy:false,username: { $regex: req.query.name.toLowerCase() }},{_id:1,username:1,orderHistory:1})
        .exec(function(err, allUsers){
            if(err) return res.status(500).send("Error its all gone wrong");
            req.users = allUsers;
            next();
        });
    }
    else{
        User.find({privacy:false},{_id:1,username:1,orderHistory:1})
        .exec(function(err, allUsers){
            if(err) return res.status(500).send("Error its all gone wrong");
            req.users = allUsers;
            next();
        });
        
    }
}

//Sends all users to allUsers.pug to properly register the page
function sendUsers(req,res){
    res.format({
        'text/html':()=>{res.render('allUsers',{users:req.users} )},
        'application/json': ()=>{res.json(req.users)}
    });
}

//Gets single user from the requested link
function getSingleUser(req,res,next){
    User.findById(req.params.id,{_id:1,username:1,orderHistory:1,privacy:1})
    .exec(function(err, user){
        if(err) return res.status(404).send("Error the user you are trying to access does not exisit");
        req.foundUser = user;

        //then finds all order ids in the given user
        Order.find({'_id': { $in:req.foundUser.orderHistory}}, function(err, orders){
            req.orderHistory = orders;
        });
        next();
    });

}

//Sends the gotten user to pug so page can be properly displayed
function sendSingleUser(req,res,next){
    //own page var set so page can determine wether or not to load the privacy change button
    let ownPage = false;
    //if the requested user is the current session user set this vairable to true to the privacy change button will be loaded
    if(req.foundUser._id == req.session.userID){
        ownPage = true;
    }
    //if the requested users privacy is set to true and they are not the session user
    if(req.foundUser.privacy == true && ownPage == false){
        //then they are accessing a page that does not exist and the proper status and error message will explain
        res.status(403).send("Error you do not have permission to view that profile");
        return;
    }
    //if not the page will load
    else{  
        res.format({
            //sends all needed information to the pug page to be rendered
            'text/html':()=>{res.render('userProfile',{user:req.foundUser,ownPage:ownPage})},
            'application/json': ()=>{res.json(req.foundUser)}
        });
    }
}

//Gets the requested order from url id
function getOrder(req,res,next){

    Order.findOne({"_id" : ObjectId(req.params.id)}).lean()
    .exec(function(err, order){
        if(err) return res.status(404).send("Error the user you are trying to access does not exisit");
        req.foundOrder = order;
        next();
    });
}

//Sends found order to pug so the page can be properly displayed
function sendOrder(req,res,next){

    User.findOne({"_id" : ObjectId(req.foundOrder.userIdWhoOrdered)}).lean()
    .exec(function(err, user){
        if(err) return res.status(404).send("Error the user you are trying to access does not exisit");
        req.foundOrderer = user;      

        let ownPage = false;
        //if the requested user is the current session user set this vairable to true to the privacy change button will be loaded
        if(req.foundOrderer._id == req.session.userID){
            ownPage = true;
        }
        //if the requested users privacy is set to true and they are not the session user
        if(req.foundOrderer.privacy == true && ownPage == false){
            //then they are accessing a page that does not exist and the proper status and error message will explain
            res.status(403).send("Error you do not have permission to view that order");
            return;
        }
        else{
            res.format({
                //sends all needed information to the pug page to be rendered
                'text/html':()=>{res.render('order',{order:req.foundOrder})},
                'application/json': ()=>{res.json(req.foundUser)}
            });
            next();
        }
        next();
    });
}

//login user
function login(req, res, next){
	if(req.session.loggedin){
        //first checks if user is already logged in, if so send proper status
		res.status(200).send("Already logged in.");
		return;
	}

    console.log("Logging in with credentials:");
    console.log("Username: " + req.body.username);
    console.log("Password: " + req.body.password);
    
    //Checks if the user name and password combination exists
    User.findOne({ 'username': req.body.username,'password':req.body.password }, function (err, userResult) {
        //if not send proper error and status
        if(err || userResult == null ||userResult.username == null){
            console.log("Error the users login information is invalid");
            res.send('<script>alert("Error that login combination is invalid"); window.location.href = "/login"; </script>');
            return;
        }
        else{ 
            //else update the session information
            req.session.loggedin = true;
            req.session.username = userResult.username;
            req.session.userID = userResult._id; //mongodb obj
            res.locals.session = req.session;

            res.status(200).redirect(`/home`);
            return;
        }
    });
}

//////////////////////////////////////////////////////////////////////////////// 
////////////Connecting and Opening server///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// 

//Connect to database
mongoose.connect('mongodb://localhost/a4',{useNewUrlParser:true,useUnifiedTopology:true});
let db = mongoose.connection;
//const MyModel = mongoose.model('User', userSchema);
db.on('error',console.error.bind(console,'Error could not connect to database'));
db.once('open',function(){
    User.init(()=>{
        app.listen(PORT,()=> console.log(`Server listening on port ${PORT}`));
    })
});