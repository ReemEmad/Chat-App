const mongoose = require("mongoose")
var findOrCreate = require("mongoose-findorcreate")
const passportLocalMongoose = require("passport-local-mongoose")

const userSchema = new mongoose.Schema(
  {
    // username: { type: String, required: true, unique: true },
    // password: { type: String, required: true, unique: true },
    // age: { type: Number, required: true, unique: true },
    username: String,
    password: String,
    age: Number,
    facebookId: String,
  },
  { collection: "users" },
)

userSchema.plugin(passportLocalMongoose)

userSchema.plugin(findOrCreate)

const model = mongoose.model("userSchema", userSchema)
module.exports = model
