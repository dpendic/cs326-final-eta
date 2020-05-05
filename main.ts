import { Database } from './database'
import { Server } from './server'

const database = new Database()

var port : number;

if (process.env.PORT != null) {
  port = parseInt(process.env.PORT as string)
} else {
  port = 8080;
}

database.connect("mongodb://heroku_vt43xv1g:qu10ii7oe4gsujgv8081s1jdjl@ds237707.mlab.com:37707/heroku_vt43xv1g").then(() => {

  const server = new Server(database, port);

}).catch((e) => {

  console.log('Failed to connect to MongoDB!');
  console.error(`\n${e.message}\n`);

})
