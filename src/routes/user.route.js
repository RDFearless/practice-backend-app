import express from "express"
import { loginUser, registerUser, logoutUser, accessRefreshToken, changeCurrentPassword } from "../controllers/user.controller.js"
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
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(accessRefreshToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

export default router