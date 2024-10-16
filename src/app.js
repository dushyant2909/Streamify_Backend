import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from "morgan";
import logger from '../logger.js';

const morganFormat = ":method :url :status :response-time ms";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Earlier you have to use body parser
app.use(express.json({
    limit: "16kb"
}))

// For handling data which comes from url
app.use(express.urlencoded({
    extended: true, // for using objects under objects
    limit: "16kb"
}))

// When you have to upload files to server like cloudinary then first 
// you keep in public folder locally
app.use(express.static("public")) // Here public is folder name

// Set up a cookie parser
app.use(cookieParser());

app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const logObject = {
                    method: message.split(" ")[0],
                    url: message.split(" ")[1],
                    status: message.split(" ")[2],
                    responseTime: message.split(" ")[3],
                };
                logger.info(JSON.stringify(logObject));
            },
        },
    })
);


export { app }