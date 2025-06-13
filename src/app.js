import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// Extra Configurations
app.use(express.json({limit: "16kb"}));
app.use(express.static("public"));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(cookieParser());

// import router
import userRouter from "./routes/user.route.js"
import videoRouter from "./routes/video.route.js"

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)

export { app }