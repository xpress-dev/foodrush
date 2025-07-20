import asyncHandler from "express-async-handler";
import { User, Address } from "../models/index.js";
import {
  formatResponse,
  generateToken,
  generateOTP,
} from "../utils/helpers.js";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phoneNumber, role = "customer" } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({
    $or: [{ email }, { phoneNumber }],
  });

  if (userExists) {
    return res
      .status(400)
      .json(
        formatResponse(
          false,
          "User with this email or phone number already exists"
        )
      );
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phoneNumber,
    role,
  });

  if (user) {
    const token = generateToken({ id: user._id });

    res.status(201).json(
      formatResponse(true, "User registered successfully", {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
        },
        token,
      })
    );
  } else {
    res.status(400).json(formatResponse(false, "Invalid user data"));
  }
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select("+password");

  if (user && (await user.comparePassword(password))) {
    if (!user.isActive) {
      return res
        .status(401)
        .json(formatResponse(false, "Your account has been deactivated"));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({ id: user._id });

    res.json(
      formatResponse(true, "Login successful", {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
        },
        token,
      })
    );
  } else {
    res.status(401).json(formatResponse(false, "Invalid email or password"));
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("addresses")
    .populate("defaultAddress");

  res.json(formatResponse(true, "Profile retrieved successfully", { user }));
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }

    const updatedUser = await user.save();

    res.json(
      formatResponse(true, "Profile updated successfully", {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          avatar: updatedUser.avatar,
        },
      })
    );
  } else {
    res.status(404).json(formatResponse(false, "User not found"));
  }
});

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  if (user && (await user.comparePassword(currentPassword))) {
    user.password = newPassword;
    await user.save();

    res.json(formatResponse(true, "Password changed successfully"));
  } else {
    res
      .status(400)
      .json(formatResponse(false, "Current password is incorrect"));
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.role) {
    query.role = req.query.role;
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }

  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await User.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Users retrieved successfully",
      { users },
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    )
  );
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    // Don't allow deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json(formatResponse(false, "Cannot delete your own account"));
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    res.json(formatResponse(true, "User account deactivated successfully"));
  } else {
    res.status(404).json(formatResponse(false, "User not found"));
  }
});

// @desc    Add user address
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req, res) => {
  const addressData = { ...req.body, user: req.user._id };

  const address = await Address.create(addressData);

  // Add address to user's addresses array
  await User.findByIdAndUpdate(req.user._id, {
    $push: { addresses: address._id },
  });

  // If this is the first address or marked as default, set as default
  if (req.body.isDefault || req.user.addresses.length === 0) {
    await User.findByIdAndUpdate(req.user._id, {
      defaultAddress: address._id,
    });
  }

  res
    .status(201)
    .json(formatResponse(true, "Address added successfully", { address }));
});

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
export const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(
    formatResponse(true, "Addresses retrieved successfully", { addresses })
  );
});

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    return res.status(404).json(formatResponse(false, "Address not found"));
  }

  Object.assign(address, req.body);
  await address.save();

  res.json(formatResponse(true, "Address updated successfully", { address }));
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    return res.status(404).json(formatResponse(false, "Address not found"));
  }

  await Address.findByIdAndDelete(req.params.id);

  // Remove from user's addresses array
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { addresses: req.params.id },
  });

  // If this was the default address, unset it
  if (
    req.user.defaultAddress &&
    req.user.defaultAddress.toString() === req.params.id
  ) {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { defaultAddress: 1 },
    });
  }

  res.json(formatResponse(true, "Address deleted successfully"));
});

// @desc    Set default address
// @route   PUT /api/users/addresses/:id/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    return res.status(404).json(formatResponse(false, "Address not found"));
  }

  // Update all addresses to not be default
  await Address.updateMany({ user: req.user._id }, { isDefault: false });

  // Set this address as default
  address.isDefault = true;
  await address.save();

  // Update user's default address
  await User.findByIdAndUpdate(req.user._id, {
    defaultAddress: address._id,
  });

  res.json(
    formatResponse(true, "Default address updated successfully", { address })
  );
});
