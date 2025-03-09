const db = require("../config/db");

class UserModel {
  static findUserByEmail(email) {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }

  static createUser(name, email, password) {
    return db
      .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, password);
  }
}

module.exports = UserModel;
