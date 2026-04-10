import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  password: "201203",
  host: "localhost",
  post: 5432,
  database: "personal_web",
});

export default pool;
