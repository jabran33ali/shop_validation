// app.js
import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import { connectDB } from "./config/db.js";
import cors from "cors";
dotenv.config();
// Connect to the database

connectDB();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000"], // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "ngrok-skip-browser-warning",
  ],
  credentials: true, // if you send cookies or auth headers
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/shops", shopRoutes); // Assuming you have a shopRoutes file

app.use("/", (req, res) => {
  res.send("Welcome to the API");
});

export default app;
