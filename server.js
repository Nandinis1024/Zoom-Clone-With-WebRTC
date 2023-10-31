const express = require('express')
const bodyParser = require('body-parser');
const session = require('express-session');
const expressSocketIoSession = require('express-socket.io-session');
const app = express()
const server = require('http').Server(app)


const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const secretKey = 'secretKey';


const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://127.0.0.1:27017/WeConvo',{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error",console.error.bind(console,"Connection error")); // Log database connection errors
db.once("open",()=> {
    console.log("Database connected successfully"); // Log successful database connection
});

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: String,
});

const User = mongoose.model('User', UserSchema);

const sessionMiddleware = session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 3600000, // 1 hour (adjust as needed)
  },
});

// Use the session middleware in Express
app.use(sessionMiddleware);

// Use express-socket.io-session
io.use(expressSocketIoSession(sessionMiddleware, {
  autoSave: true,
}));


const generateJwt = async (user) => {
  const payload = { username: user };
  try {
    const token = await jwt.sign(payload, secretKey, { expiresIn: '1h' });
    return token;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const authenticateJwt = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send('No token provided, Forbidden'); // Unauthorized
  }

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.status(401).json({ message: 'Unauthorized' }); // Unauthorized
      }
      req.user = user;
      //console.log(req.user.username);
      next();
    });
};



app.get('/home', authenticateJwt, (req, res)=>{
  res.render('home');
})

app.get('/signup', (req, res)=>{
  res.render('signup');
})


app.post('/signup', async (req, res)=>{
  const username = req.body.username;
  //console.log(username)
  const newUser = new User({username: username});
  await newUser.save();
  const token = await generateJwt(username);
  req.session.username = username;
  //console.log(req.session)
  res.cookie('token', token, { httpOnly: false });
  res.redirect('/home');
  
})



app.get( '/', authenticateJwt, (req, res) =>{
  const meetingCode = req.query.meetingCode;
  if(meetingCode != null){
    res.redirect(`/${meetingCode}`);
  }
  else{
    res.redirect(`/${uuidV4()}`);

  }  
});



app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
});






io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);

    // Broadcast a message to all users in the room when a user joins
    socket.to(roomId).broadcast.emit('user-connected', userId);

    // Listen for chat messages
    socket.on('chat message', (message, myId) => {
      //const my_user_id = myId.myId;
      const session = socket.handshake.session;
      const username = session.username;
      //console.log(username)
      io.to(roomId).emit('chat message', {message: message}, username);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      // Broadcast a message to all users in the room when a user disconnects
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

