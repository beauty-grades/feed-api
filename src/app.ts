import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import Xata from "./lib/xata";

import { populate } from "./lib/utec-api/populate";
import { getEmail } from "./lib/utec-api/get-email";

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "https://beauty-grades.vercel.app",
      "https://sistema-academico.utec.edu.pe",
    ],
  })
);

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/api/schedule", async (req, res) => {
  try {
    const tokenV1 = req.body.tokenV1;
    const tokenV2 = req.body.tokenV2;

    if (!tokenV1) {
      throw new Error("tokenV1 is missing");
    }
    if (!tokenV2) {
      throw new Error("tokenV2 is missing");
    }

    const email = await getEmail(tokenV2);

    if (!email) {
      throw new Error("Email not found. Wrong utec_token_v2.");
    }

    const student = await Xata.db.student.filter({ email }).getFirst();

    if (!student) {
      await Xata.db.student.create({
        email,
        utec_token_v1: tokenV1,
        utec_token_v2: tokenV2,
        last_token_stored_at: new Date(),
      });
    } else {
      await student.update({
        utec_token_v1: tokenV1,
        utec_token_v2: tokenV2,
        last_token_stored_at: new Date(),
      });
    }

    res.status(200).json({
      ok: true,
    });

  } catch (error) {
    console.error(error);
    res.json({
      error: error.message,
    });
  }
});

app.get("/api/curriculums", async (req, res) => {
  try {
    const curriculums = await Xata.db.curriculum.getAll();
    res.json({
      ok: true,
      curriculums,
    });
  } catch (error) {
    console.error(error);
    res.json({
      error: error.message,
    });
  }
});

app.post("/api/populate", async (req, res) => {
  try {
    const utec_token_v1 = req.body.utec_token_v1;
    const utec_token_v2 = req.body.utec_token_v2;

    if (!utec_token_v1) {
      throw new Error("utec_token_v1 is missing");
    }
    if (!utec_token_v2) {
      throw new Error("utec_token_v2 is missing");
    }

    const email = await getEmail(utec_token_v2);

    if (!email) {
      throw new Error("Email not found. Wrong utec_token_v2.");
    }

    const student = await Xata.db.student.filter({ email }).getFirst();
    await student.update({
      populating: true,
    });
    console.log("Started populating", email);
    await populate(utec_token_v1, email);
    await student.update({
      populating: false,
      last_populated_at: new Date(),
    });
    console.log("Finished populating", email);

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);
    res.json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`App listening at ${port}`);
});
