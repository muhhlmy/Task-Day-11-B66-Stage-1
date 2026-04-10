import express from "express";
import { engine } from "express-handlebars";
import pool from "./config/db.js";
import session from "express-session";
import flash from "connect-flash";

const app = express();
const port = 3000;

// Middleware untuk membaca data dari request body (JSON & form-urlencoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Express Session
app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(flash());

// Flash Message Middleware
app.use((req, res, next) => {
  res.locals.success_messages = req.flash("success");
  res.locals.error_messages = req.flash("error");
  next();
});

// Setup Express Handlebars
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: "./src/views/layouts",
    partialsDir: "./src/views/partials",
  }),
);

// Setup View Engine
app.set("view engine", "hbs");
app.set("views", "./src/views");

// Folder public untuk file statis (CSS, JS, Images)
app.use(express.static("./public"));

// FUNGSI
// Format Waktu dari DB
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatter.format(d);
};

// Hitung Durasi Project
const getDuration = (start, end) => {
  if (!start || !end) return "0 Hari";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;

  if (months > 0) {
    return `${months} Bulan${days > 0 ? ` ${days} Hari` : ""}`;
  } else {
    return `${diffDays} Hari`;
  }
};

// HOME
app.get("/", (req, res) => {
  const tailwindLogo = `<img src="/images/tailwind.svg" width='30"' alt="" />`;
  const techStack = [
    {
      icon: '<i class="fa-brands fa-html5 text-3xl"></i>',
      techName: "HTML",
    },
    {
      icon: '<i class="fa-brands fa-css3 text-3xl"></i>',
      techName: "CSS",
    },
    {
      icon: '<i class="fa-brands fa-js text-3xl"></i>',
      techName: "JavaScript",
    },
    {
      icon: tailwindLogo,
      techName: "Tailwind",
    },
    {
      icon: '<i class="fa-brands fa-python text-3xl"></i>',
      techName: "Python",
    },
    {
      icon: '<i class="fa-brands fa-node-js text-3xl"></i>',
      techName: "Node.JS",
    },
  ];

  res.render("home", {
    title: "Home",
    techStack,
  });
});

// CONTACT
app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact",
  });
});

// PROJECT
app.get("/projects", async (req, res) => {
  try {
    const query = "SELECT * FROM projects ORDER BY id DESC";
    const result = await pool.query(query);
    // console.log(result.rows);

    const formattedProjects = result.rows.map((p) => {
      return {
        id: p.id,
        projectName: p.projectName,
        projectStartDate: formatDate(p.projectStartDate),
        projectEndDate: formatDate(p.projectEndDate),
        projectDescription: p.projectDescription,
        projectImage: p.projectImage,
        isNodeJs: p.isNodeJs,
        isNextJs: p.isNextJs,
        isReactJs: p.isReactJs,
        isTypescript: p.isTypescript,
        duration: getDuration(p.projectStartDate, p.projectEndDate),
      };
    });

    // console.log(formattedProjects);

    res.render("projects", { title: "Projects", projects: formattedProjects });
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal mengambil data dari database");
    res.redirect("/");
  }
});

// PROJECT CREATE
app.post("/project", async (req, res) => {
  const {
    projectName,
    projectStartDate,
    projectEndDate,
    projectDescription,
    projectImage,
    isNodeJs,
    isNextJs,
    isReactJs,
    isTypescript,
  } = req.body;

  const isNodeJsDb = isNodeJs === "true";
  const isNextJsDb = isNextJs === "true";
  const isReactJsDb = isReactJs === "true";
  const isTypescriptDb = isTypescript === "true";
  const image = projectImage || "";

  try {
    const query = `
      INSERT INTO projects (
        "projectName", "projectStartDate", "projectEndDate", "projectDescription", "projectImage",
        "isNodeJs", "isNextJs", "isReactJs", "isTypescript"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      projectName,
      projectStartDate,
      projectEndDate,
      projectDescription,
      image,
      isNodeJsDb,
      isNextJsDb,
      isReactJsDb,
      isTypescriptDb,
    ];
    await pool.query(query, values);
    req.flash("success", "Project berhasil ditambahkan!");
    res.redirect("/projects");
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal menambah data project");
    res.redirect("/projects");
  }
});

// PROJECT DETAIL
app.get("/project/detail/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "SELECT * FROM projects WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      req.flash("error", "Project tidak ditemukan!");
      return res.redirect("/projects");
    }

    const project = result.rows[0];

    project.duration = getDuration(
      project.projectStartDate,
      project.projectEndDate,
    );
    project.projectStartDate = formatDate(project.projectStartDate);
    project.projectEndDate = formatDate(project.projectEndDate);

    res.render("project-detail", {
      title: "Detail - " + project.projectName,
      project: project,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal mengambil detail project");
    res.redirect("/projects");
  }
});

// PROJECT EDIT VIEW
app.get("/project/edit/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "SELECT * FROM projects WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      req.flash("error", "Project tidak ditemukan!");
      return res.redirect("/projects");
    }

    const project = result.rows[0];

    // Format tanggal ke YYYY-MM-DD agar masuk ke form type="date"
    if (project.projectStartDate) {
      project.projectStartDate = new Date(project.projectStartDate)
        .toISOString()
        .split("T")[0];
    }

    if (project.projectEndDate) {
      project.projectEndDate = new Date(project.projectEndDate)
        .toISOString()
        .split("T")[0];
    }

    res.render("project-edit", {
      title: "Edit - " + project.projectName,
      project: project,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal mengambil data untuk edit project");
    res.redirect("/projects");
  }
});

// PROJECT UPDATE
app.post("/project/update/:id", async (req, res) => {
  const { id } = req.params;

  const {
    projectName,
    projectStartDate,
    projectEndDate,
    projectDescription,
    projectImage,
    isNodeJs,
    isNextJs,
    isReactJs,
    isTypescript,
  } = req.body;

  const isNodeJsDb = isNodeJs === "true";
  const isNextJsDb = isNextJs === "true";
  const isReactJsDb = isReactJs === "true";
  const isTypescriptDb = isTypescript === "true";
  const image = projectImage || "";

  try {
    const query = `
      UPDATE projects SET 
        "projectName" = $1, "projectStartDate" = $2, "projectEndDate" = $3,
        "projectDescription" = $4, "projectImage" = $5, "isNodeJs" = $6,
        "isNextJs" = $7, "isReactJs" = $8, "isTypescript" = $9
      WHERE id = $10
    `;
    const values = [
      projectName,
      projectStartDate,
      projectEndDate,
      projectDescription,
      image,
      isNodeJsDb,
      isNextJsDb,
      isReactJsDb,
      isTypescriptDb,
      id,
    ];
    await pool.query(query, values);
    req.flash("success", "Project berhasil diperbarui!");
    res.redirect("/projects");
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal memperbarui data project");
    res.redirect(`/project/edit/${id}`);
  }
});

// PROJECT DELETE
app.post("/project/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM projects WHERE id = $1";
    await pool.query(query, [id]);
    req.flash("warning", "Project berhasil dihapus!");
    res.redirect("/projects");
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal menghapus data project");
    res.redirect("/projects");
  }
});

// Run Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
