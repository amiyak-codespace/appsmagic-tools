import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const router = express.Router();

const upload = multer({ dest: '/tmp/uploads/' });
const apiKey = process.env.GEMINI_API_KEY;

const ALMIGHTY_SCRIPT_PATH = '/tmp/almighty_worker.py';
const workerScript = `import sys
import os
import google.generativeai as genai

def process_file(file_path, requirement, api_key):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-3.1-pro-preview')
    
    ext = os.path.splitext(file_path)[1].lower()
    out_path = file_path + "_output"
    
    prompt = f"You are an expert data processor. The file is at {file_path}. The requirement is: {requirement}. Generate ONLY raw executable Python code to fulfill this requirement and save the result to {out_path}. Use fitz for PDFs, Pillow for images. Do not use markdown blocks."
    
    response = model.generate_content(prompt)
    code = response.text.replace('\`\`\`python', '').replace('\`\`\`', '').strip()
    
    try:
        exec(code, globals())
        print(f"SUCCESS: Saved to {out_path}")
    except Exception as e:
        print(f"ERROR executing code: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(1)
    process_file(sys.argv[1], sys.argv[2], sys.argv[3])
`;

if (!fs.existsSync(ALMIGHTY_SCRIPT_PATH)) {
    fs.writeFileSync(ALMIGHTY_SCRIPT_PATH, workerScript.replace(/\\\\/g, '\\'));
}

router.post('/process-document', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { requirement } = req.body;
    
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!requirement) return res.status(400).json({ error: 'Requirement string needed' });

    const ext = path.extname(file.originalname).lower();
    const filePath = file.path;
    const outputPath = `${filePath}_output`;

    try {
        const { stdout, stderr } = await execAsync(`python3 ${ALMIGHTY_SCRIPT_PATH} "${filePath}" "${requirement}" "${apiKey}"`);
        
        if (fs.existsSync(outputPath)) {
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 10 * 60 * 1000);
            
            res.setHeader('Content-Disposition', `attachment; filename="processed_${file.originalname}"`);
            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);
        } else {
            throw new Error("Worker executed but output file was not found. Output: " + stdout);
        }
    } catch (e) {
        console.error("Execution error:", e);
        res.status(500).json({ error: 'Failed to process document', details: e.message });
    }

  } catch (error) {
    console.error('Doc Process error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
