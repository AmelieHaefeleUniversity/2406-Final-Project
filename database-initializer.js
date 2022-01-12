let userNames = ["winnifred", "lorene", "cyril", "vella", "erich", "pedro", "madaline", "leoma", "merrill",  "jacquie"];
let users = [];

const { ObjectId } = require('bson');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Order = require("./models/orderModel");
const User = require("./models/userModel");

userNames.forEach(name =>{
	let u = new User();
	u.username = name;
	u.password = name;
	u.privacy = false;
	u.orderHistory = [];
	users.push(u);
});


mongoose.connect('mongodb://localhost/a4',{useNewUrlParser:true,useUnifiedTopology:true}); 
const db = mongoose.connection;
db.on('error',console.error.bind(console,'Connection Error'));
db.once('open',()=>{
	db.dropDatabase((err)=>{
		if(err){
			console.log("Couldn't drop data base");
			throw err;
		}
		User.init((err)=>{
			if(err) throw err;
			User.insertMany(users,(err)=>{
				if(err){
					console.log("Couldn't drop data base");
					throw err;
				}
				console.log(`${users.length} users added`);
				db.close();
			});
		});
	});
});
