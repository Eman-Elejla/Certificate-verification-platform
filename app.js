// دوال التبديل بين الواجهات
function switchView(view) {
    const verifyView = document.getElementById('verification-view');
    const issueView = document.getElementById('issuer-view');
    const navVerify = document.getElementById('nav-verify');
    const navIssue = document.getElementById('nav-issue');

    if (view === 'verification') {
        if(verifyView) verifyView.style.display = 'block';
        if(issueView) issueView.style.display = 'none';
        if(navVerify) navVerify.className = "px-4 py-2 rounded-md font-medium text-blue-600 bg-blue-50";
        if(navIssue) navIssue.className = "px-4 py-2 rounded-md font-medium text-gray-600 hover:text-blue-600";
    } else {
        if(issueView) issueView.style.display = 'block';
        if(verifyView) verifyView.style.display = 'none';
        if(navIssue) navIssue.className = "px-4 py-2 rounded-md font-medium text-blue-600 bg-blue-50";
        if(navVerify) navVerify.className = "px-4 py-2 rounded-md font-medium text-gray-600 hover:text-blue-600";
    }
}

// انتشال العناصر والربط عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    loadCertificateTable();
    document.getElementById('nav-verify').addEventListener('click', () => switchView('verification'));
    document.getElementById('nav-issue').addEventListener('click', () => switchView('issuer'));

    const dropZone = document.getElementById('drop-zone');
    const mainFileInput = document.getElementById('mainFileInput');

    if(dropZone && mainFileInput) {
        dropZone.addEventListener('click', () => mainFileInput.click());
        mainFileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) handleVerifyCertificate(e.target.files[0]);
        });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-blue-500', 'bg-blue-50'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            if (e.dataTransfer.files.length > 0) handleVerifyCertificate(e.dataTransfer.files[0]);
        });
    }

    const issueForm = document.getElementById('issueForm');
    if(issueForm) {
        issueForm.addEventListener('submit', handleIssueCertificate);
    }
});
async function loadCertificateTable() {
    const tableBody = document.getElementById('blockchain-table-body');
    if (!tableBody) return;

    try {
        console.log("جارٍ محاولة الاتصال بالسيرفر...");
        
        // تعديل 1: تأكدي من المسار - إذا فشل الرابط الكامل، استخدمي المسار النسبي './api/list'
        const response = await fetch('http://localhost:3000/api/list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        // تعديل 2: التحقق من رد السيرفر قبل محاولة قراءته كـ JSON
        if (!response.ok) {
            throw new Error(`السيرفر رد بحالة: ${response.status}`);
        }

        const list = await response.json();
        console.log("البيانات المستلمة:", list); 

        tableBody.innerHTML = '';
        
        if (!list || list.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">لا توجد شهادات حالياً.</td></tr>';
            return;
        }

        list.forEach(cert => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4">${cert.studentName || '---'}</td>
                <td class="px-6 py-4">${cert.courseTitle || '---'}</td>
                <td class="px-6 py-4">${cert.universityId || '---'}</td>
                <td class="px-6 py-4 text-xs">${(cert.certId || '').substring(0, 8)}...</td>
                <td class="px-6 py-4 text-green-600">✅ موثقة</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        // تعديل 3: هذا السطر سيخبرنا بالضبط أين يكمن العطل
        console.error("خطأ مفصل:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center">خطأ اتصال: ${error.message}</td></tr>`;
    }
}
// حساب بصمة الملف
async function calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة فحص الشهادة (لا تحتاج تغيير لأننا جعلنا الـ Hash هو الـ certId)
async function handleVerifyCertificate(file) {
    if (!file) return;
    const spinner = document.getElementById('verify-spinner');
    const resultBox = document.getElementById('result-box');
    if(spinner) spinner.classList.remove('hidden');
    if(resultBox) resultBox.classList.add('hidden');

    try {
        const fileHash = await calculateFileHash(file);
        const response = await fetch(`http://localhost:3000/api/verify/${fileHash}`);
        const result = await response.json();

        if(!resultBox) return;
        resultBox.classList.remove('hidden');

        if (result.isValid) {
            resultBox.className = "p-6 rounded-xl border bg-green-50 border-green-200 space-y-2";
            resultBox.innerHTML = `
                <div class="text-green-700 font-bold text-lg">✅ شهادة موثقة وصالحة!</div>
                <p class="text-sm text-gray-700"><strong>الطالب:</strong> ${result.studentName}</p>
                <p class="text-sm text-gray-700"><strong>الدورة:</strong> ${result.courseTitle}</p>
                <p class="text-sm text-gray-700"><strong>التقدير:</strong> ${result.grade}</p>
                <p class="text-sm text-gray-700"><strong>التاريخ:</strong> ${result.issueDate}</p>
            `;
        } else {
            resultBox.className = "p-6 rounded-xl border bg-red-50 border-red-200 space-y-2";
            resultBox.innerHTML = `<div class="text-red-700 font-bold text-lg">❌ ${result.message || 'شهادة غير موجودة'}</div>`;
        }
    } catch (error) {
        alert("فشل الاتصال بالسيرفر.");
    } finally {
        if(spinner) spinner.classList.add('hidden');
    }
}

// دالة إصدار الشهادة (المعدلة)
async function handleIssueCertificate(event) {
    event.preventDefault();

    const fileInput = document.getElementById('certificateFileInput');
    const file = fileInput ? fileInput.files[0] : null;
    if(!file) return alert("الرجاء اختيار ملف الشهادة");

    const btn = document.getElementById('submitBtn');
    if(btn) { btn.disabled = true; btn.innerText = "جاري الإصدار..."; }

    try {
        const fileHash = await calculateFileHash(file);
        
        // البيانات المرسلة للسيرفر
        const payload = {
            certId: fileHash,
            studentName: document.getElementById('studentNameInput').value,
            courseTitle: document.getElementById('majorInput').value,
            grade: "امتياز" // يمكنك ربط هذا بـ input خاص بالتقدير
        };

        const response = await fetch('http://localhost:3000/api/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            alert("تم التوثيق على البلوكشين بنجاح!");
            document.getElementById('issueForm').reset();
        } else {
            alert("خطأ: " + result.error);
        }
    } catch (error) {
        alert("فشل الاتصال.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = "✍️ توقيع وإصدار"; }
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    console.log("الصفحة جاهزة، جارٍ تحميل الجدول...");
    await loadCertificateTable();
});