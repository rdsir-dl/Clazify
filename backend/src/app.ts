import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PdfParser } from './parser/pdf_parser';
import { GoogleSheetsService } from './services/google_sheets';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up Multer for file upload in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Endpoint for uploading PDF timetable and parsing it
 */
app.post(
  '/api/v1/timetable/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const file = req.file;
      const trainerName = req.body.trainerName;

      if (!file) {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }

      if (!trainerName || typeof trainerName !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid trainerName' });
      }

      console.log(`Parsing PDF for trainer: "${trainerName}", size: ${file.size} bytes`);
      const lectures = await PdfParser.extractTimetable(file.buffer, trainerName);

      return res.status(200).json({ lectures });
    } catch (error: any) {
      console.error('Error during parsing:', error);
      return res.status(500).json({
        error: 'Failed to parse timetable PDF',
        details: error.message || error,
      });
    }
  }
);

/**
 * Endpoint for fetching student strength from Google Sheets config
 */
app.get('/api/v1/student-strength', async (req: Request, res: Response): Promise<any> => {
  const batch = req.query.batch as string;
  const group = req.query.group as string;
  const subject = req.query.subject as string;

  if (!batch) {
    return res.status(400).json({ error: 'Missing batch parameter' });
  }

  let totalStudents = 0; // Default if not found in sheets/entered
  let found = false;

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (spreadsheetId) {
    console.log(`PULLING STRENGTH FROM SHEETS: ID=${spreadsheetId}`);
    const strengths = await GoogleSheetsService.fetchStudentStrengths(spreadsheetId);
    const matched = strengths.find((item) => {
      const batchMatch = item.batch.toLowerCase() === batch.toLowerCase();
      const groupMatch = !group || !item.group || item.group.toLowerCase() === group.toLowerCase();
      const subjectMatch = !subject || !item.subject || item.subject.toLowerCase() === subject.toLowerCase();
      return batchMatch && groupMatch && subjectMatch;
    });

    if (matched) {
      totalStudents = matched.totalStudents;
      found = true;
      console.log(`MATCHED SHEETS RECORD: ${batch} ${group || ''} -> ${totalStudents}`);
    }
  }

  return res.status(200).json({
    batch,
    group: group || 'All',
    subject: subject || 'All',
    totalStudents,
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Clazify Backend listening at http://localhost:${port}`);
  });
}

export default app;
