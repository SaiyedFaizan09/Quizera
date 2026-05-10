const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Password policy:
// - at least 8 characters
// - at least one lowercase
// - at least one uppercase
// - at least one digit
// - at least one special character
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include a lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include an uppercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must include a number" };
  }
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
    return { valid: false, message: "Password must include a special character" };
  }
  return { valid: true };
}

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // Validate password against policy
  const pwdCheck = validatePassword(password);
  if (!pwdCheck.valid) {
    return res.status(400).json({ message: pwdCheck.message });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const jwt = require("jsonwebtoken");

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔐 Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile (name for now)
exports.updateUser = async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name.trim();
    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Provide current and new password" });
  }

  // Validate new password against policy
  const pwdCheck = validatePassword(newPassword);
  if (!pwdCheck.valid) {
    return res.status(400).json({ message: pwdCheck.message });
  }

  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};