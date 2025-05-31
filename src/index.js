import connectDB from "./db/index.js";
import dotenv from "dotenv"
dotenv.config({
    path: "./env"
})


// Approach 1 -> clean and modular approach

connectDB() //  Connecting to DB
















// Approach 2 -> good but pollutes index.js

/*
const app = express();
const port = process.env.PORT;
// Using IIFE syntax of JS 
// 1. Use async-await -> DB is in another continent
// 2. Use try-catch 
;(async () => {
    try {
        // Connecting to DB
        await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`);
        
        // DB connected but express is not listening
        app.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error;
        })
        
        app.listen(port, () => {
            console.log("Backend in running...");
        })
        
    } catch (error) {
        console.error("ERROR: ", error);
        throw error;
    }
})()
*/