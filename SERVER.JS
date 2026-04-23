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

/* CONNECT DB */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err))

/* ================= MODEL ================= */

const User = mongoose.model("User", new mongoose.Schema({
  email:{ type:String, unique:true },
  password:String,
  role:{ type:String, default:"user" },
  devices:[String],
  ip:String,
  createdAt:{ type:Date, default:Date.now }
}))

/* ================= MIDDLEWARE ================= */

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

/* ================= AUTH ================= */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* REGISTER */
app.post("/register", async (req,res)=>{
  const { email, password, device } = req.body
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress

  if(!emailRegex.test(email))
    return res.json({msg:"Email tidak valid"})

  if(!password || password.length < 6)
    return res.json({msg:"Password minimal 6 karakter"})

  if(await User.findOne({email}))
    return res.json({msg:"Email sudah terdaftar"})

  if(await User.findOne({devices:device}))
    return res.json({msg:"Device sudah pernah dipakai"})

  const hash = await bcrypt.hash(password,10)

  const user = await User.create({
    email,
    password:hash,
    devices:[device],
    ip
  })

  const token = jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_SECRET,
    { expiresIn:"7d" }
  )

  res.json({msg:"Register sukses", token})
})

/* LOGIN */
app.post("/login", async (req,res)=>{
  const { email, password, device } = req.body

  const user = await User.findOne({email})
  if(!user) return res.json({msg:"User tidak ditemukan"})

  const match = await bcrypt.compare(password,user.password)
  if(!match) return res.json({msg:"Password salah"})

  // limit 2 device
  if(!user.devices.includes(device)){
    if(user.devices.length >= 2){
      return res.json({msg:"Maksimal 2 device"})
    }
    user.devices.push(device)
    await user.save()
  }

  const token = jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_SECRET,
    { expiresIn:"7d" }
  )

  res.json({msg:"Login sukses", token})
})

/* ================= PROTECTED TEST ================= */

app.get("/me", auth, async (req,res)=>{
  const user = await User.findById(req.user.id)
  res.json(user)
})

/* ================= START ================= */

app.listen(process.env.PORT || 3000, ()=>{
  console.log("KSANF RUNNING")
})
