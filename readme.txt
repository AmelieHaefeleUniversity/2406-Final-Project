Authour: Amelie Haefele
Instructions to run:
1. Run “npm init” to download dependencies
3.Create a database folder
2. Open terminal and cd into folder then run “mongod --dbpath="database" ” to start up mongodb
3. Open up a separate terminal and cd to the same place and run “node database-initializer.js”
4. Then run “npm start” to load up the server
5. Finally you can open http://localhost:3000/ to view the webpage


Design choices:
In my last assignment I ended up using outside router files but for variety's sake I decided to do this one with router files. It was nice not having to deal with them but as you can see the code can get a bit jumbled. To combat this issue I’ve used large comments as separators for different sections of the code. I decided to use mongoose instead of mongodb and it was a life saver. The only issue I ran into was querying the database for subSchemas but was able to solve it.