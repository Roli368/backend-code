import multer from "multer";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {


    // todo: for users

  //  const uniqueSuffix = Date.now() + '-' + Math.round
  // (Math.random() * 1E9)
    cb(null, file.originalname)
  }
})
export const upload = multer({
    storage
})

/*import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../public/temp")); // ✅ absolute path
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Or use unique name logic
  }
});

export const upload = multer({ storage });
*/