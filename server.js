import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const app = express();
app.use(cors({
    origin: '*', // السماح لأي مصدر بالاتصال
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// أضيفي هذا السطر لتشغيل الملفات
app.use(express.static('./'));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const artifactPath = path.join(__dirname, 'artifacts', 'contracts', 'CertiChain.sol', 'CertiChain.json');

const artifactRaw = fs.readFileSync(artifactPath, 'utf8');
const contractABI = JSON.parse(artifactRaw).abi;

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner(0);
const certiChainContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

// جلب قائمة الشهادات
app.get('/api/verify/:hash', async (req, res) => {
    try {
        const hash = req.params.hash;
        const cert = await certiChainContract.getCertificate(hash);
        
        // التحقق من وجود الشهادة (بناءً على اسم الطالب أو أي حقل)
        if (!cert.studentName) {
            return res.json({ isValid: false, message: "شهادة غير موجودة" });
        }
        
        res.json({
            isValid: true,
            studentName: cert.studentName,
            courseTitle: cert.courseTitle,
            grade: cert.grade,
            issueDate: new Date(Number(cert.issueDate) * 1000).toLocaleString()
        });
    } catch (error) {
        res.json({ isValid: false, message: "شهادة غير موجودة أو خطأ في الاتصال" });
    }
});
// أضيفي هذه الدالة تحديداً لجلب قائمة الشهادات للجدول
app.get('/api/list', async (req, res) => {
    try {
        const ids = await certiChainContract.getAllCertIds().catch(() => []);
        const certificates = [];
        for (const id of ids) {
            const cert = await certiChainContract.getCertificate(id);
            certificates.push({
                certId: id.toString(),
                studentName: cert.studentName,
                courseTitle: cert.courseTitle,
                universityId: cert.universityId || "N/A",
                grade: cert.grade,
                issueDate: cert.issueDate ? new Date(Number(cert.issueDate) * 1000).toLocaleString() : "---"
            });
        }
        res.json(certificates);
    } catch (error) {
        res.json([]);
    }
});

// دالة استقبال طلبات الإصدار من المتصفح
app.post('/api/issue', async (req, res) => {
    try {
        const { certId, studentName, courseTitle, grade } = req.body;
        
        // استدعاء دالة العقد الذكي لإصدار الشهادة
        const tx = await certiChainContract.issueCertificate(certId, studentName, courseTitle, grade);
        await tx.wait(); // انتظار تأكيد البلوكشين
        
        res.json({ success: true, message: "تم التوثيق بنجاح!" });
    } catch (error) {
        console.error("خطأ في الإصدار:", error);
        res.json({ success: false, error: error.message });
    }
});
// أضيفي هذا السطر في ملف server.js
//app.use(express.static('./'));

// باقي الدوال (Issue, Verify) تضاف هنا...

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Running on: http://localhost:${PORT}`);
});