import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { populate } from "./script.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "https://sistema-academico.utec.edu.pe",
      "https://beauty-grades.vercel.app",
    ],
  })
);

app.use(bodyParser.json());

app.post("/api/populate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Authorization header is missing");
    }
    const email = req.body.email;
    if (!email) {
      throw new Error("Email is missing");
    }

    await populate(authHeader, email);
    res.json({
      ok: true,
    });
  } catch (error) {
    res.json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`App listening at ${port}`);
});
