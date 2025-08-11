// controllers/user.controller.js
import User from "../models/user.model.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  const { name, username, email, password, role } = req.body;

  const creatorRole = req.user?.role || "admin"; // In case of initial admin-create

  const roleHierarchy = {
    admin: ["admin", "manager", "supervisor", "executive", "auditor"],
    manager: ["supervisor", "executive", "auditor"],
    supervisor: ["executive", "auditor"],
    executive: ["auditor"],
    user: [],
  };

  if (!roleHierarchy[creatorRole].includes(role)) {
    return res.status(403).json({ message: `You can't create role: ${role}` });
  }

  const userExists = await User.findOne({ username });
  if (userExists)
    return res.status(400).json({ message: "Username already taken" });

  const user = await User.create({ name, username, email, password, role });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    token: generateToken(user),
  });
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Successful login
    res.status(200).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user),
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
