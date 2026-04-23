require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const compression = require("compression")
const rateLimit = require("express-rate-limit")

const app = express()

/* MIDDLEWARE */
app.use(cors())
app.use(express.json())
app.use(compression())

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}))

app.use(express.static("public", {
  maxAge: 0
}))
  maxAge: "7d",
  etag: true
}))

/* DB */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err))

/* ================= MODEL ================= */

const User = mongoose.model("User", new mongoose.Schema({
  email:{ type:String, unique:true },
  password:String,
  role:{ type:String, default:"user" },
  devices:[String],
  ip:String
}))

const Video = mongoose.model("Video", new mongoose.Schema({
  title:String,
  url:String,
  thumbnail:String
}))

const Setting = mongoose.model("Setting", new mongoose.Schema({
  vipPrice:Number,
  vipDuration:Number
}))

const Payment = mongoose.model("Payment", new mongoose.Schema({
  name:String,
  number:String
}))

/* INDEX (PERFORMA) */
User.collection.createIndex({email:1})
Video.collection.createIndex({_id:-1})

/* ================= AUTH ================= */

function auth(req,res,next){
  const token = req.headers.authorization
  if(!token) return res.status(401).json({msg:"Unauthorized"})
  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  }catch{
    res.status(401).json({msg:"Token invalid"})
  }
}

function adminOnly(req,res,next){
  if(req.user.role !== "admin"){
    return res.status(403).json({msg:"Admin only"})
  }
  next()
}

/* ================= AUTO ADMIN ================= */

async function createAdmin(){
  const email = process.env.yesisuliyani054@gmail.com
  const password = process.env.ksanf123

  if(!email || !password) return

  let exist = await User.findOne({email})
  if(!exist){
    const hash = await bcrypt.hash(password,10)

    await User.create({
      email,
      password:hash,
      role:"admin",
      devices:[]
    })

    console.log("ADMIN SIAP:", email)
  }
}
createAdmin()

/* ================= AUTH API ================= */

app.post("/register", async (req,res)=>{
  const { email, password, device } = req.body
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress

  if(await User.findOne({email}))
    return res.json({msg:"Email sudah ada"})

  const hash = await bcrypt.hash(password,10)

  let role = "user"
  if(email === process.env.ADMIN_EMAIL){
    role = "admin"
  }

  const user = await User.create({
    email,
    password:hash,
    devices:[device],
    ip,
    role
  })

  const token = jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_SECRET
  )

  res.json({token})
})

app.post("/login", async (req,res)=>{
  const { email, password, device } = req.body

  const user = await User.findOne({email})
  if(!user) return res.json({msg:"User tidak ada"})

  const match = await bcrypt.compare(password,user.password)
  if(!match) return res.json({msg:"Password salah"})

  if(!user.devices.includes(device)){
    if(user.devices.length >= 2){
      return res.json({msg:"Max 2 device"})
    }
    user.devices.push(device)
    await user.save()
  }

  const token = jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_SECRET
  )

  res.json({token})
})

/* ================= VIDEO ================= */

app.get("/videos", async (req,res)=>{
  const v = await Video.find().sort({_id:-1}).limit(20)
  res.json(v)
})

/* ================= VIP ================= */

app.get("/vip", async (req,res)=>{
  res.json(await Setting.findOne())
})

app.get("/payment", async (req,res)=>{
  res.json(await Payment.find())
})

/* ================= ADMIN ================= */

app.get("/admin/users", auth, adminOnly, async (req,res)=>{
  res.json(await User.find())
})

app.post("/admin/video", auth, adminOnly, async (req,res)=>{
  res.json(await Video.create(req.body))
})

app.delete("/admin/video/:id", auth, adminOnly, async (req,res)=>{
  await Video.findByIdAndDelete(req.params.id)
  res.json({msg:"deleted"})
})

app.post("/admin/vip", auth, adminOnly, async (req,res)=>{
  let s = await Setting.findOne()
  if(!s) s = await Setting.create(req.body)
  else{
    s.vipPrice = req.body.vipPrice
    s.vipDuration = req.body.vipDuration
    await s.save()
  }
  res.json(s)
})

app.post("/admin/payment", auth, adminOnly, async (req,res)=>{
  res.json(await Payment.create(req.body))
})

/* ================= START ================= */

app.listen(process.env.PORT || 3000, ()=>{
  console.log("KSANF RUNNING 🚀")
})    
