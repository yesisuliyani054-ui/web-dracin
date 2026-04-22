require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("DB CONNECTED"))

/* MODEL */
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

/* AUTH */
function auth(req,res,next){
  const token = req.headers.authorization
  if(!token) return res.json({msg:"No token"})
  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  }catch{
    res.json({msg:"Invalid token"})
  }
}

function adminOnly(req,res,next){
  if(req.user.role !== "admin")
    return res.json({msg:"Admin only"})
  next()
}

/* REGISTER */
app.post("/register", async (req,res)=>{
  const { email, password, device } = req.body
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress

  if(await User.findOne({email}))
    return res.json({msg:"Email sudah ada"})

  if(await User.findOne({devices:device}))
    return res.json({msg:"Device sudah dipakai"})

  const hash = await bcrypt.hash(password,10)

  await User.create({
    email,
    password:hash,
    devices:[device],
    ip
  })

  res.json({msg:"Register sukses"})
})

/* LOGIN */
app.post("/login", async (req,res)=>{
  const { email, password, device } = req.body

  const user = await User.findOne({email})
  if(!user) return res.json({msg:"User tidak ada"})

  const match = await bcrypt.compare(password,user.password)
  if(!match) return res.json({msg:"Password salah"})

  if(!user.devices.includes(device)){
    if(user.devices.length >= 2)
      return res.json({msg:"Max 2 device"})
    user.devices.push(device)
    await user.save()
  }

  const token = jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_SECRET
  )

  res.json({token})
})

/* VIDEO */
app.get("/videos", async (req,res)=>{
  res.json(await Video.find())
})

/* ADMIN */
app.get("/admin/users", auth, adminOnly, async (req,res)=>{
  res.json(await User.find())
})

app.post("/admin/video", auth, adminOnly, async (req,res)=>{
  res.json(await Video.create(req.body))
})

/* START */
app.listen(process.env.PORT || 3000, ()=>{
  console.log("KSANF RUNNING")
})
