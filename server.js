const FacebookStrategy = require("passport-facebook").Strategy
var GoogleStrategy = require("passport-google-oauth2").Strategy
const passport = require("passport")
const io = require("socket.io")(3000)
const Redis = require("redis")
const express = require("express")
const path = require("path")
const cors = require("cors")
const mongoose = require("mongoose")
const User = require("./model/user")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const http = require("http")
require("dotenv").config()
const nodemailer = require("nodemailer")

const JWT_SECRET = "2323D324%#@#!dd"

mongoose.connect("mongodb://localhost:27017/login-app-db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})

const app = express()
const server = http.createServer(app)
const client = Redis.createClient()
app.set("views", "./views")
app.set("views", path.join(__dirname, "./views"))
app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401)
}

// app.use("/", express.static(path.join(__dirname, "static")))
app.use(express.json())
app.use(cors())

passport.use(User.createStrategy())

const rooms = {}

passport.serializeUser(function (user, done) {
  done(null, user.id)
})
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user)
  })
})

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.CLIENT_ID_FB,
      clientSecret: process.env.CLIENT_SECRET_FB,
      callbackURL: "http://localhost:4300/auth/facebook/chatapp",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user)
      })
    },
  ),
)

app.get("/auth/facebook", passport.authenticate("facebook"))

app.get(
  "/auth/facebook/chatapp",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:4300/")
  },
)

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID_GOOGLE,
      clientSecret: process.env.CLIENT_SECRET_GOOGLE,
      callbackURL: "http://localhost:4300/auth/google/callback",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user)
      })
    },
  ),
)

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
)

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:4300",
    failureRedirect: "/auth/google/failure",
  }),
)

app.get("/auth/failute", (req, res) => {
  res.send("something went wrong")
})

app.post("/ha", async (req, res) => {
  const { email } = req.body
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "zetta.wintheiser16@ethereal.email", // generated ethereal user
      pass: "j9PEH3d2UerJ4yKS3e", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  const message = {
    from: '"The chat app 👻" <chatapp@example.com>', // sender address
    to: `${email}`, // list of receivers
    subject: "Sign up confirmation ✔", // Subject line
    text: "This email is sent to confirm you signing up successfully to Chat App, Welcome", // plain text body
    html: "<a href=`http://localhost:4300`>Visit our app</a>", // html body
  }
  // send mail with defined transport object
  const info = await transporter.sendMail(message)

  console.log("Message sent: %s", info.messageId)
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

  res.send("email sent")
})

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms })
})

app.get("/login", (req, res) => {
  res.render("login")
})

app.get("/register", async (req, res) => {
  res.render("register")
})

app.get("/:room", (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect("/")
  }
  res.render("room", { roomName: req.params.room })
})

app.post("/room", (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect("/")
  }
  rooms[req.body.room] = { users: {} }
  res.redirect(req.body.room)
  io.emit("room created", req.body.room)
})

app.post("/api/register", async (req, res) => {
  const { username, password, age } = req.body
  const hashedPass = await bcrypt.hash(password, 15)

  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "zetta.wintheiser16@ethereal.email", // generated ethereal user
      pass: "j9PEH3d2UerJ4yKS3e", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  const message = {
    from: '"The chat app 👻" <chatapp@example.com>', // sender address
    to: `${username}@test.com`, // list of receivers
    subject: "Sign up confirmation ✔", // Subject line
    text: "This email is sent to confirm you signing up successfully to Chat App, Welcome", // plain text body
    html: "<a href=`http://localhost:4300`>Visit our app</a>", // html body
  }
  // send mail with defined transport object
  const info = await transporter.sendMail(message)

  console.log("Message sent: %s", info.messageId)
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  try {
    const response = await User.create({ username, password: hashedPass, age })
    res.send({ status: "email sent" })
    // res.render(path.resolve(__dirname + "/views/index"))
    console.log(response, "success")
  } catch (err) {
    console.log(err)
  }
})

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username }).lean()
  if (!user) {
    return res.json({ status: "error", error: "invalid password/username" })
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
    )
    // return res.render("index", { rooms: rooms })
    // return res.render(path.resolve(__dirname + "/views/index"))
    return res.json({ status: "ok", data: token })
  }
  res.json({ status: "error", error: "invalid password/username" })
})

server.listen(4300, () => {
  console.log("server is running")
})

client
  .connect()
  .then(() => {
    console.log("client ready")
  })
  .catch((err) => {
    console.log(err)
  })

async function sendMessage(socket, room) {
  const res = await client.LRANGE(`messages_${room}`, 0, -1)
  console.log(res)
  res.map((x) => {
    const usernameMessage = x.split(":")
    const redisUsername = usernameMessage[0]
    const redisMessage = usernameMessage[1]
    socket.emit("chat-message", {
      message: redisMessage,
      name: redisUsername,
    })
  })
}

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    sendMessage(socket, room)
    socket.join(room)
    rooms[room].users[socket.id] = name

    socket.to(room).emit("user-connected", name)
  })
  socket.on("send-chat-message", (room, message) => {
    client.rPush(
      `messages_${room}`,
      `${rooms[room].users[socket.id]}:${message}`,
    )
    socket.to(room).emit("chat-message", {
      message: message,
      name: rooms[room].users[socket.id],
    })
  })

  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket.to(room).emit("user-disconnected", rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
  })
})

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}
