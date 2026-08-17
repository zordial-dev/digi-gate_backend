import multer from 'multer';
import path from 'path';
import fs from 'fs';

interface UploadOptions {
  folder?: string;
  filename?: string;
}

export const createUpload = (options: UploadOptions = {}) => {
  const { folder = 'selfies', filename } = options;

  const uploadDir = path.join('public', folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      if (filename) {
        const ext = path.extname(file.originalname);
        cb(null, `${filename}${ext}`);
      } else {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `selfie-${uniqueSuffix}${ext}`);
      }
    },
  });

  const fileFilter = (_req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed (JPEG, PNG, WEBP)'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
};

export default createUpload();