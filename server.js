import express from "express";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import ejs from "ejs";
import puppeteer from "puppeteer";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Configure directories
const requiredDirs = [
  join(__dirname, "public/uploads"),
  join(__dirname, "public/generated"),
];

requiredDirs.forEach((dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(express.static(join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + extname(file.originalname));
  },
});

const upload = multer({ storage });

// Routes
app.post("/generate-resume", upload.single("profilePic"), async (req, res) => {
  let uploadedFile = null;
  let browser = null;

  try {
    if (!req.file) throw new Error("No file uploaded");
    uploadedFile = req.file;

    const userData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      skills: req.body.skills,
      experience: req.body.experience,
      profilePic: `/uploads/${uploadedFile.filename}`,
    };

    const html = await ejs.renderFile(
      join(__dirname, "views/template.ejs"),
      userData
    );

    const pdfFilename = `resume_${Date.now()}.pdf`;
    const pdfPath = join(__dirname, "public/generated", pdfFilename);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    res.json({
      success: true,
      pdfUrl: `/generated/${pdfFilename}`,
      downloadUrl: `/download?pdf=generated/${pdfFilename}`,
    });
  } catch (error) {
    if (uploadedFile) {
      try {
        unlinkSync(join(__dirname, "public/uploads", uploadedFile.filename));
      } catch (err) {
        console.error("File cleanup error:", err);
      }
    }
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/preview", (req, res) => {
  const pdfPath = join(__dirname, "public", req.query.pdf);
  existsSync(pdfPath) ? res.sendFile(pdfPath) : res.status(404).send("PDF not found");
});

app.get("/download", (req, res) => {
  const pdfPath = join(__dirname, "public", req.query.pdf);
  if (existsSync(pdfPath)) {
    res.setHeader("Content-Disposition", "attachment");
    res.sendFile(pdfPath);
  } else {
    res.status(404).send("PDF not found");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));