require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("public"))

/* ================= CONNECT DB ================= */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("DB CONNECTED"))

/* ================= MODEL ================= */
const Video = mongoose.model("Video", new mongoose.Schema({
  title: String,
  url: String,
  thumbnail: String,
  isVIP: Boolean
}))

/* ================= API ================= */

// GET VIDEO
app.get("/videos", async (req,res)=>{
  const data = await Video.find()
  res.json(data)
})

// ADD VIDEO (ADMIN ONLY SIMPLE VERSION)
app.post("/video", async (req,res)=>{
  await Video.create(req.body)
  res.json({msg:"video added"})
})

// DELETE VIDEO
app.delete("/video/:id", async (req,res)=>{
  await Video.findByIdAndDelete(req.params.id)
  res.json({msg:"deleted"})
})

/* ================= START ================= */
app.listen(process.env.PORT || 3000, ()=>{
  console.log("KSANF RUNNING")
})
