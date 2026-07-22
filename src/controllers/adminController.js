// authController.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

const signToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role  // Include role in the payload for better authorization
    },
    process.env.JWT_SECRET,
    { expiresIn: Number(process.env.JWT_EXPIRES_IN) }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const signup = async (req, res) => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "Email already in use",
      });
    }

    const newUser = await User.create({
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || "admin", // Set default role or use provided role
    });

    createSendToken(newUser, 201, res);
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email and password",
      });
    }

    // Find user by email and include the password field
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect email or password",
      });
    }

    // If you still want to restrict to admin only, use this:
    // if (user.role !== 'admin') {
    //   return res.status(403).json({
    //     status: "error",
    //     message: "Only administrators can access this panel",
    //   });
    // }

    createSendToken(user, 200, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Update Password Controller
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // This should come from your auth middleware

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "New password must be at least 6 characters",
      });
    }

    // Find the user by ID and include the password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        status: false,
        status: "error",
        message: "User not found",
      });
    }

    // Verify the old password
    const isPasswordValid = await user.correctPassword(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "Old password is incorrect",
      });
    }

    // Update the password
    user.password = newPassword;
    await user.save();

    // Send a new token
    createSendToken(user, 200, res);
  } catch (error) {
    console.error("Update password error:", error);
    res.status(400).json({
      success: false,
      status: "error",
      message: error.message,
    });
  }
};