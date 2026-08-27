import express from "express";
import { registerOAuthRoutes } from "../../server/_core/oauth.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
registerOAuthRoutes(app);

export default app;
