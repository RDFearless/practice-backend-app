import express from "express"
import { loginUser, registerUser, logoutUser, accessRefreshToken, changeCurrentPassword, getCurrentUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js"
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
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-avatar").patch(
    verifyJWT, 
    upload.single("avatar"),
    updateUserAvatar
);
router.route("/update-cover-image").patch(
    verifyJWT, 
    upload.single("coverImage"),
    updateUserCoverImage
);
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router