import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { populate } from "./script.js";
import { getXataClient } from "./xata.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: ["https://beauty-grades.vercel.app"],
  })
);

app.use(bodyParser.json());

app.post("/api/populate", async (req, res) => {
  try {
    const Xata = getXataClient;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Authorization header is missing");
    }
    const email = req.body.email;
    if (!email) {
      throw new Error("Email is missing");
    }

    const user = await Xata.db.user.filter({ email }).getFirst();
    await user.update({
      populating: true,
    });
    await populate(authHeader, email);
    await user.update({
      populating: false,
      last_populated_at: new Date(),
    });

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
