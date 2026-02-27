const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    return {
      folder: 'scrap-trade/bills',
      // Store everything as 'image' - Cloudinary can store PDFs as image type
      // This gives us a viewable URL instead of forced download
      resource_type: 'image',
      // Keep original format so PDF stays PDF but is accessible via image CDN
      format: isPDF ? 'jpg' : undefined,
      // High quality for bill readability
      transformation: isPDF ? [{ quality: 90, dpi: 150 }] : [],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
});

module.exports = { cloudinary, upload };