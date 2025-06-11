import express from "express"
import { loginUser, registerUser, logoutUser, accessRefreshToken, changeCurrentPassword, getCurrentUser, updateUserAvatar } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

// secured routes - user is logged in
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(accessRefreshToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-user").post(verifyJWT, getCurrentUser);
router.route("/update-avatar").post(
    verifyJWT, 
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    updateUserAvatar
);


export default router