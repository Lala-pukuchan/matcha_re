const getJwt = require("./functions/getJwt");

// express server
const express = require("express");
const app = express();
const PORT = 4000;

// access to uploaded img
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// use cors
const cors = require("cors");
app.use(cors({ credentials: true, origin: process.env.FRONT_URL }));

// use json
app.use(express.json());

// db connection
const mariadb = require("mariadb");
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// bcrypt for password hashing
const bcrypt = require("bcrypt");

// create unique userId
const { v4: uuidv4 } = require("uuid");

// jwt for authentication
const jwt = require("jsonwebtoken");

// password generator
const crypto = require("crypto");

// cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// form conversion
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const directory = "/app/uploads/";
const fs = require("fs");

// mail
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_APP_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// get user api
app.get("/api/userinfo", async (req, res) => {
  // return userinfo inside jwt token
  let token;
  try {
    token = req.cookies.token;
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    if (!claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { password, ...user } = claims;
    return res.json({ user });
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

// get users api
app.post("/api/users/", async (req, res) => {
  console.log("req.body: ", req.body);
  // get gender and preference to show users
  let queryFields = [];
  let values = [];
  if (req.body.gender) {
    queryFields.push("preference = ?");
    values.push(req.body.gender);
  }
  if (req.body.preference) {
    if (req.body.preference === "no") {
      console.log("no preference");
    } else {
      console.log("preference: ", req.body.preference);
      queryFields.push("gender = ?");
      values.push(req.body.preference);
    }
  }

  // create query
  let baseQuery = "SELECT * FROM user";
  if (queryFields.length > 0) {
    const whereClause = queryFields.join(" AND ");
    baseQuery += " WHERE " + whereClause;
  }
  console.log("baseQuery: ", baseQuery);
  console.log("values: ", values);

  // get users
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(baseQuery, values);
    return res.json(rows);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// get user api
app.post("/api/user", async (req, res) => {
  const userId = req.body.userId;
  let conn;
  try {
    // get user
    conn = await pool.getConnection();
    let queryString = "SELECT * FROM user WHERE id = ?";
    let values = [req.body.userId];
    const userResult = await conn.query(queryString, values);
    if (userResult.length > 0) {
      // get tags
      const user = userResult[0];
      const tagQuery = "SELECT tag_id FROM usertag WHERE user_id = ?";
      const tagsResult = await conn.query(tagQuery, values);
      const tagIdsArray = tagsResult.map((tag) => tag.tag_id);
      user.tagIds = tagIdsArray;
      // get matched count
      const matchedQuery =
        "SELECT * FROM matched WHERE matched_user_id_1 = ? OR matched_user_id_2 = ?";
      const matchedValues = [userId, userId];
      const matchedResult = await conn.query(matchedQuery, matchedValues);
      user.matched = matchedResult.length;
      // get liked count
      const likedQuery = "SELECT * FROM liked WHERE liked_to_user_id = ?";
      const likedValues = [userId];
      const likedResult = await conn.query(likedQuery, likedValues);
      user.liked = likedResult.length;
      // get viewed count
      const viewedQuery = "SELECT * FROM viewed WHERE viewed_to_user_id = ?";
      const viewedValues = [userId];
      const viewedResult = await conn.query(viewedQuery, viewedValues);
      user.viewed = viewedResult.length;
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// create user api
app.post("/api/createUser", upload.none(), async (req, res) => {
  // create user
  let conn;
  try {
    // generate unique userId
    const userId = uuidv4();
    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // insert DB
    conn = await pool.getConnection();
    const values = [
      userId,
      req.body.email,
      req.body.username,
      req.body.lastname,
      req.body.firstname,
      hashedPassword,
    ];
    const result = await conn.query(
      "INSERT INTO user(id, email, username, lastname, firstname, password) VALUES (?, ?, ?, ?, ?, ?)",
      values
    );

    // create jwt
    const payload = {
      id: userId,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // send email
    const mailSetting = {
      from: process.env.GMAIL_APP_USER,
      to: req.body.email,
      subject: "Enable Your Account",
      html: `
        <p>To enable your account, please click <a href="http://localhost:${PORT}/api/enable?token=${token}">here</a>.</p>
      `,
    };
    transporter.sendMail(mailSetting, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
        return res.status(500).json({ message: "Internal server error" });
      } else {
        console.log("Email sent: ", info.response);
      }
    });

    // return success message
    return res.json({
      message: "User created successfully",
      id: result.insertId.toString(),
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// update userinfo
app.post(
  "/api/user/update",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "picture1", maxCount: 1 },
    { name: "picture2", maxCount: 1 },
    { name: "picture3", maxCount: 1 },
    { name: "picture4", maxCount: 1 },
    { name: "picture5", maxCount: 1 },
  ]),
  async (req, res) => {
    console.log("req.body:", req.body);

    let updateFields = [];
    let values = [];
    if (req.body.lastname) {
      updateFields.push("lastname = ?");
      values.push(req.body.lastname);
    }
    if (req.body.firstname) {
      updateFields.push("firstname = ?");
      values.push(req.body.firstname);
    }
    if (req.body.email) {
      updateFields.push("email = ?");
      values.push(req.body.email);
    }
    if (req.body.gender) {
      updateFields.push("gender = ?");
      values.push(req.body.gender);
    }
    if (req.body.preference) {
      updateFields.push("preference = ?");
      values.push(req.body.preference);
    }
    if (req.body.biography) {
      updateFields.push("biography = ?");
      values.push(req.body.biography);
    }
    if (req.body.longitude) {
      updateFields.push("longitude = ?");
      values.push(req.body.longitude);
    }
    if (req.body.latitude) {
      updateFields.push("latitude = ?");
      values.push(req.body.latitude);
    }

    // save uploaded images
    if (req.files) {
      if (req.files["profilePicture"]) {
        const { originalname, path } = req.files["profilePicture"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("profilePic = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
      if (req.files["picture1"]) {
        const { originalname, path } = req.files["picture1"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("pic1 = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
      if (req.files["picture2"]) {
        const { originalname, path } = req.files["picture2"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("pic2 = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
      if (req.files["picture3"]) {
        const { originalname, path } = req.files["picture3"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("pic3 = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
      if (req.files["picture4"]) {
        const { originalname, path } = req.files["picture4"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("pic4 = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
      if (req.files["picture5"]) {
        const { originalname, path } = req.files["picture5"][0];
        fs.renameSync(path, directory + originalname);
        updateFields.push("pic5 = ?");
        values.push(`http://localhost:${PORT}/uploads/` + originalname);
      }
    }

    // update user profile
    const userId = req.body.userId;
    let conn;
    try {
      conn = await pool.getConnection();
      let queryString =
        "UPDATE user SET " + updateFields.join(", ") + " WHERE id = ?";
      const userId = req.body.userId;
      values.push(userId);
      const result = await conn.query(queryString, values);

      // update user tags
      const user_id = [userId];
      await conn.query("DELETE FROM usertag WHERE user_id = ?", user_id);
      tagIds = req.body.tags;
      if (tagIds) {
        console.log("tagIds.length: ", tagIds.length);
        for (const tagId of tagIds) {
          console.log("add tag: ", tagId);
          const values = [userId, tagId];
          await conn.query(
            "INSERT INTO usertag(user_id, tag_id) VALUES (?, ?)",
            values
          );
        }
      }

      // update jwt token
      query = "SELECT * FROM user WHERE id = ?";
      const rows = await conn.query(query, user_id);
      const token = await getJwt(rows[0], tagIds);
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 86400000,
      });

      // success message
      return res.status(200).json({ message: "success" });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (conn) return conn.end();
    }
  }
);

// enable user
app.get("/api/enable", async (req, res) => {
  const token = req.query.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let conn;
    try {
      conn = await pool.getConnection();
      const userId = [decoded.id];
      const result = await conn.query(
        "UPDATE user SET enabled = TRUE WHERE id = ?",
        [userId]
      );
      res.send(
        `<!DOCTYPE html><html><body><p>Account has been successfully enabled.Please login from <br><a href="${process.env.FRONT_URL}/login">here</a></p></body></html>`
      );
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (conn) return conn.end();
    }
  } catch (error) {
    return res.status(401).json({ message: "invalid token" });
  }
});

// login api
app.post("/api/login", upload.none(), async (req, res) => {
  // validate user
  let conn;
  try {
    conn = await pool.getConnection();
    query = "SELECT * FROM user WHERE username = ?";
    const values = [req.body.username];
    const rows = await conn.query(query, values);
    if (rows.length == 0) {
      return res.status(401).json({ message: "invalid username" });
    }
    if (!rows[0].enabled) {
      return res.status(401).json({ message: "user is not enabled" });
    }
    if (await bcrypt.compare(req.body.password, rows[0].password)) {
      // get user tags
      const query = "SELECT tag_id FROM usertag WHERE user_id = ?";
      const userId = [rows[0].id];
      const result = await conn.query(query, userId);
      const tagIdsArray = result.map((tag) => tag.tag_id);
      // get jwt token
      const token = await getJwt(rows[0], tagIdsArray);
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 86400000,
      });
      return res.json({ message: "success" });
    } else {
      return res.status(401).json({ message: "invalid password" });
    }
  } catch (e) {
    console.log(e);
  } finally {
    if (conn) return conn.end();
  }
});

// viewed api
app.post("/api/viewed", async (req, res) => {
  console.log("req.body: ", req.body);
  // insert viewed information
  let conn;
  try {
    conn = await pool.getConnection();
    const values = [req.body.from, req.body.to];
    const result = await conn.query(
      "INSERT INTO viewed (from_user_id, viewed_to_user_id, viewed_at) VALUES (?, ?, NOW())",
      values
    );
    console.log("result: ", result);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// viewed users api
app.post("/api/user/viewed", async (req, res) => {
  let conn;
  try {
    // get viwed from users
    conn = await pool.getConnection();
    let queryString =
      "SELECT DISTINCT from_user_id FROM viewed WHERE viewed_to_user_id = ?";
    let values = [req.body.userId];
    const viewedFromUsers = await conn.query(queryString, values);
    if (viewedFromUsers.length > 0) {
      res.json(viewedFromUsers);
    } else {
      res.json([]);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// liked api
app.post("/api/liked", async (req, res) => {
  let conn;
  try {
    // insert liked information
    conn = await pool.getConnection();
    const values = [req.body.from, req.body.to];
    const result = await conn.query(
      "INSERT INTO liked (from_user_id, liked_to_user_id, liked_at) VALUES (?, ?, NOW())",
      values
    );
    // check if liked back
    const reverseLiked = await conn.query(
      "SELECT * FROM liked WHERE liked_to_user_id = ? AND from_user_id = ?",
      values
    );
    // match
    if (reverseLiked.length > 0) {
      const values2 = [req.body.from, req.body.to];
      const result2 = await conn.query(
        "INSERT INTO matched (matched_user_id_1, matched_user_id_2) VALUES (?, ?)",
        values
      );
    }
    return res.json({ message: "success" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// liked api
app.post("/api/unliked", async (req, res) => {
  let conn;
  try {
    // delete liked
    conn = await pool.getConnection();
    const values = [req.body.from, req.body.to];
    result = await conn.query(
      "DELETE FROM liked WHERE from_user_id = ? AND liked_to_user_id = ?",
      values
    );
    // delete matched
    values.push(values[0], values[1]);
    const result2 = await conn.query(
      "DELETE FROM matched WHERE (matched_user_id_1 = ? AND matched_user_id_2 = ?) OR (matched_user_id_2 = ? AND matched_user_id_1 = ?)",
      values
    );
    return res.json({ message: "success" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// liked users api
app.post("/api/user/liked", async (req, res) => {
  let conn;
  try {
    // get viwed from users
    conn = await pool.getConnection();
    let queryString =
      "SELECT DISTINCT from_user_id FROM liked WHERE liked_to_user_id = ?";
    let values = [req.body.userId];
    const likedFromUsers = await conn.query(queryString, values);
    if (likedFromUsers.length > 0) {
      res.json(likedFromUsers);
    } else {
      res.json([]);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// liked users api
app.post("/api/user/likedTo", async (req, res) => {
  let conn;
  try {
    // get viwed from users
    conn = await pool.getConnection();
    let queryString =
      "SELECT DISTINCT liked_to_user_id FROM liked WHERE from_user_id = ?";
    let values = [req.body.userId];
    const likedFromUsers = await conn.query(queryString, values);
    if (likedFromUsers.length > 0) {
      res.json(likedFromUsers);
    } else {
      res.json([]);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// resetpassword api
app.post("/api/resetpassword", upload.none(), async (req, res) => {
  let conn;
  try {
    // generate new password
    const buffer = crypto.randomBytes(10);
    const newPassword = buffer.toString("hex").slice(0, 10);
    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const values = [hashedPassword, req.body.email];
    conn = await pool.getConnection();
    const result = await conn.query(
      "UPDATE user SET password = ? WHERE email = ?",
      values
    );

    // send email
    const mailSetting = {
      from: process.env.GMAIL_APP_USER,
      to: req.body.email,
      subject: "Reset Your Password",
      html: `
        <p>Your password is updated.<br>${newPassword}</p>
      `,
    };
    transporter.sendMail(mailSetting, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
        return res.status(500).json({ message: "Internal server error" });
      } else {
        console.log("Email sent: ", info.response);
      }
    });
    return res.json({ message: "Please confirm new password via email" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// logout api
app.post("/api/logout", async (req, res) => {
  console.log("token delete");
  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
  });
  res.send({ message: "success" });
});

// get tags
app.get("/api/tags", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM tag");
    console.log("tags:", rows);
    return res.json(rows);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// add new tag
app.post("/api/tag", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const values = [req.body.name];
    const existing = await conn.query(
      "SELECT * FROM tag WHERE name = (?)",
      values
    );
    if (existing.length > 0) {
      return res.status(200).json({ message: "Tag is existing" });
    } else {
      const rows = await conn.query("INSERT INTO tag(name) VALUES (?)", values);
      const result = await conn.query(
        "SELECT * FROM tag WHERE name = (?)",
        values
      );
      return res.json(result[0]);
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (conn) return conn.end();
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
