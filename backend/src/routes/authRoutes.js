const express = require("express");
const router = express.Router();
const {
	registerUser,
	loginUser,
	updateUser,
	changePassword,
} = require("../controllers/authController");
const protect = require("../middlewares/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
// protected update route to change profile (name)
router.put("/update", protect, updateUser);
// protected route to change password
router.put("/change-password", protect, changePassword);

module.exports = router;
