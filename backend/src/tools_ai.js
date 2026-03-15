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

// Ensure Gemini key is present
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

router.post('/process-document', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { requirement } = req.body;
    
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!requirement) return res.status(400).json({ error: 'Requirement string needed' });

    // Step 1: Use AI to interpret the user requirement and generate a Python script to fulfill it.
    // The script will execute locally on the file.
    
    const ext = path.extname(file.originalname).lower();
    const filePath = file.path;
    
    // System instruction for the script generator
    const prompt = `
You are an Almighty Python script generator.
The user has uploaded a file with extension "${ext}".
The user's requirement is: "${requirement}"

Write a Python 3 script that reads the file at "${filePath}", performs the requested operation exactly as instructed, and saves the final result to "${filePath}_output".

If the user wants a PDF manipulated (merged, split, edited, cropped, converted to images), use \`fitz\` (PyMuPDF).
If the user wants an image manipulated or generated, use \`Pillow\` (PIL).
If the user wants data parsed, use standard libraries or \`pandas\`.
Do not wrap the code in markdown blocks like \`\`\`python. Only output the raw python code.

Example structure:
import sys
import fitz
input_file = "${filePath}"
output_file = "${filePath}_output"
# ... logic ...
# Save to output_file
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
    const result = await model.generateContent(prompt);
    let pythonScript = result.response.text();
    
    // Clean markdown if accidentally included
    pythonScript = pythonScript.replace(/^```python\n/g, '').replace(/```$/g, '');
    
    const scriptPath = `${filePath}_script.py`;
    fs.writeFileSync(scriptPath, pythonScript);
    
    // Execute the script
    try {
        const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`);
        
        // Return the modified file
        const outputPath = `${filePath}_output`;
        
        if (fs.existsSync(outputPath)) {
            // Schedule cleanup after 10 mins (600,000 ms)
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 10 * 60 * 1000);
            
            // Set correct headers based on extension
            if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
            else if (['.jpg', '.jpeg'].includes(ext)) res.setHeader('Content-Type', 'image/jpeg');
            else if (ext === '.png') res.setHeader('Content-Type', 'image/png');
            
            res.setHeader('Content-Disposition', `attachment; filename="processed_${file.originalname}"`);
            
            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);
        } else {
            throw new Error("Script executed but output file was not found. Output: " + stdout + " | " + stderr);
        }
    } catch (e) {
        console.error("Execution error:", e);
        res.status(500).json({ error: 'Failed to process document', details: e.message, script: pythonScript });
    }

  } catch (error) {
    console.error('Doc Process error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
