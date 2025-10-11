/**
 * Project Name: SocialEcho
 * Description: A social networking platform with automated content moderation and context-based authentication system.
 *
 * Author: Neaz Mahmud
 * Email: neaz6160@gmail.com
 * Date: 19th June 2023
 */

require("dotenv").config();
const express = require("express");
const adminRoutes = require("./routes/admin.route");
const userRoutes = require("./routes/user.route");
const postRoutes = require("./routes/post.route");
const communityRoutes = require("./routes/community.route");
const contextAuthRoutes = require("./routes/context-auth.route");
const search = require("./controllers/search.controller");
const Database = require("./config/database");
const decodeToken = require("./middlewares/auth/decodeToken");

const app = express();
app.set("trust proxy", true);
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");

const PORT = process.env.PORT || 4000;

const db = new Database(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

db.connect().catch((err) =>
  console.error("Error connecting to database:", err)
);

app.use(
  cors({
    origin: "*",
  })
);
app.use(morgan("dev"));
app.use("/api/assets/userFiles", express.static(__dirname + "/api/assets/userFiles"));
app.use(
  "/api/assets/userAvatars",
  express.static(__dirname + "/api/assets/userAvatars")
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
require("./config/passport.js");

app.get("/api/server-status", (req, res) => {
  res.status(200).json({ message: "Server is up and running!" });
});
app.get('/', (req, res) => res.status(200).send('OK'));

app.get("/api/search", decodeToken, search);

app.use("/api/auth", contextAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/admin", adminRoutes);

process.on("SIGINT", async () => {
  try {
    await db.disconnect();
    console.log("Disconnected from database.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

app.listen(PORT, () => console.log(`Server up and running on port ${PORT}!`));
