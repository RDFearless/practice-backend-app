import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js"; 

dotenv.config({
    path: "./env"
})

const port = process.env.PORT || 3000 || 3001 || 4000;

// Approach 2 -> clean and modular approach

connectDB() // returns a Promise

.then(() => {
    
    // DB connected but server is not listening
    app.on("error", (err) => {
        console.log("DB connection succesful, but can't connect to express app !!", err);
        throw err;
    })
    
    app.listen(port, () => {
        console.log(`Server is listening on port: ${port}`);
    })
})

.catch((err) => {
    console.log("MONGODB connection failed !!", err);
}) 















// Approach 1 -> good but pollutes index.js

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