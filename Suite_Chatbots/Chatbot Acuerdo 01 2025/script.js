document.addEventListener('DOMContentLoaded', () => {
    const pdfUploadInput = document.getElementById('pdf-upload');
    const pdfNameDisplay = document.getElementById('pdf-name');
    const pdfStatusDisplay = document.getElementById('pdf-status');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');
    const sendButtonText = document.getElementById('send-button-text');
    const chatDisplay = document.getElementById('chat-display');
    const loadingSpinner = document.getElementById('loading-spinner');
    const newChatButton = document.getElementById('new-chat-button');
    const togglePdfViewerButton = document.getElementById('toggle-pdf-viewer-button');
    const toggleThemeButton = document.getElementById('toggle-theme-button');
    const pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const pdfIframe = document.getElementById('pdf-iframe');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadHtmlBtn = document.getElementById('download-html-btn');
    const downloadChatbotBtn = document.getElementById('download-chatbot-btn');
    const modelSelector = document.getElementById('model-selector');
    const pdf2UploadInput = document.getElementById('pdf2-upload');
    const pdf2NameDisplay = document.getElementById('pdf2-name');
    const pdf2StatusDisplay = document.getElementById('pdf2-status');
    const pdf2Section = document.getElementById('pdf2-section');

    // URL del backend — la API Key vive en el servidor, no en el frontend
    const BACKEND_URL = 'https://node.proyectodescartes.org/api/ia/text';

    let pdfTextContent = "";
    let currentPdfName = "";
    let currentPdfTitle = "";
    let currentPdfFileUrl = null;
    let isProcessing = false;
    let pdfViewerVisible = false;
    let pdf2TextContent = "";
    let currentPdf2Name = "";

    // ----- Theme -----
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            toggleThemeButton.textContent = '☀️';
            toggleThemeButton.title = 'Cambiar a tema claro';
        } else {
            document.body.classList.remove('dark-mode');
            toggleThemeButton.textContent = '🌓';
            toggleThemeButton.title = 'Cambiar a tema oscuro';
        }
    }

    toggleThemeButton.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    applyTheme(localStorage.getItem('theme') || 'light');

    // ----- Event Listeners -----
    pdfUploadInput.addEventListener('change', handlePdfUpload);
    pdf2UploadInput.addEventListener('change', handlePdf2Upload);
    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!sendButton.disabled) handleSendQuestion();
        }
    });
    newChatButton.addEventListener('click', resetChat);
    togglePdfViewerButton.addEventListener('click', togglePdfViewer);
    downloadHtmlBtn.addEventListener('click', downloadSessionHtml);
    downloadPdfBtn.addEventListener('click', downloadSessionPdf);
    downloadChatbotBtn.addEventListener('click', downloadChatbot);

    // ----- Reset -----
    function resetChat() {
        pdfTextContent = ""; currentPdfName = ""; currentPdfTitle = "";
        if (currentPdfFileUrl) { URL.revokeObjectURL(currentPdfFileUrl); currentPdfFileUrl = null; }
        pdfNameDisplay.textContent = "Ningún archivo seleccionado";
        pdfStatusDisplay.textContent = "";
        pdfUploadInput.value = null;
        pdf2TextContent = ""; currentPdf2Name = "";
        pdf2NameDisplay.textContent = "Ningún archivo seleccionado";
        pdf2StatusDisplay.textContent = "";
        pdf2UploadInput.value = null;
        pdf2Section.style.display = 'none';
        chatDisplay.innerHTML = '<div class="system-message">Por favor, carga un PDF para comenzar.</div>';
        questionInput.value = "";
        questionInput.disabled = true;
        sendButton.disabled = true;
        downloadPdfBtn.disabled = true;
        downloadHtmlBtn.disabled = true;
        downloadChatbotBtn.disabled = true;
        togglePdfViewerButton.disabled = true;
        togglePdfViewerButton.textContent = "👁 Ver PDF";
        if (pdfViewerContainer.classList.contains('visible')) pdfViewerContainer.classList.remove('visible');
        pdfIframe.src = 'about:blank';
        pdfViewerVisible = false;
    }

    function togglePdfViewer() {
        if (!currentPdfFileUrl) return;
        pdfViewerVisible = !pdfViewerVisible;
        if (pdfViewerVisible) {
            pdfViewerContainer.classList.add('visible');
            pdfIframe.src = currentPdfFileUrl;
            togglePdfViewerButton.textContent = "✕ Ocultar PDF";
        } else {
            pdfViewerContainer.classList.remove('visible');
            togglePdfViewerButton.textContent = "👁 Ver PDF";
        }
    }

    // ----- PDF 1 Upload -----
    function handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        resetChat();
        pdfNameDisplay.textContent = file.name;
        const isValid = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isValid) {
            pdfStatusDisplay.textContent = `"${file.name}" no es un PDF válido.`;
            pdfStatusDisplay.style.color = "var(--danger-color)";
            return;
        }
        currentPdfName = file.name;
        pdfStatusDisplay.textContent = "Procesando PDF...";
        pdfStatusDisplay.style.color = "var(--warning-color)";
        addMessageToChat("Cargando " + currentPdfName + "...", "system");
        if (currentPdfFileUrl) URL.revokeObjectURL(currentPdfFileUrl);
        currentPdfFileUrl = URL.createObjectURL(file);
        togglePdfViewerButton.disabled = false;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const typedarray = new Uint8Array(e.target.result);
            try {
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let text = "";
                try {
                    const meta = await pdf.getMetadata();
                    currentPdfTitle = meta?.info?.Title?.trim() || "";
                } catch(_) { currentPdfTitle = ""; }
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const tc = await page.getTextContent();
                    tc.items.forEach(item => text += item.str + " ");
                    text += "\n";
                }
                pdfTextContent = text;
                pdfStatusDisplay.textContent = `"${currentPdfName}" cargado. ¡Listo para preguntar!`;
                pdfStatusDisplay.style.color = "var(--success-color)";
                questionInput.disabled = false;
                sendButton.disabled = false;
                addMessageToChat(`"${currentPdfName}" está listo.`, "system");
                questionInput.focus();
                downloadChatbotBtn.disabled = false;
                pdf2Section.style.display = 'block';
            } catch (error) {
                pdfStatusDisplay.textContent = "Error al procesar el PDF.";
                pdfStatusDisplay.style.color = "var(--danger-color)";
                pdfTextContent = "";
                addMessageToChat("Error procesando PDF: " + error.message, "system error");
                if (currentPdfFileUrl) { URL.revokeObjectURL(currentPdfFileUrl); currentPdfFileUrl = null; }
                togglePdfViewerButton.disabled = true;
                pdfUploadInput.value = null;
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ----- PDF 2 Upload -----
    function handlePdf2Upload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const isValid = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isValid) {
            pdf2StatusDisplay.textContent = `"${file.name}" no es un PDF válido.`;
            pdf2StatusDisplay.style.color = "var(--danger-color)";
            return;
        }
        currentPdf2Name = file.name;
        pdf2NameDisplay.textContent = file.name;
        pdf2StatusDisplay.textContent = "Procesando segundo PDF...";
        pdf2StatusDisplay.style.color = "var(--warning-color)";
        const reader = new FileReader();
        reader.onload = async (e) => {
            const typedarray = new Uint8Array(e.target.result);
            try {
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let text = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const tc = await page.getTextContent();
                    tc.items.forEach(item => text += item.str + " ");
                    text += "\n";
                }
                pdf2TextContent = text;
                pdf2StatusDisplay.textContent = `"${currentPdf2Name}" cargado.`;
                pdf2StatusDisplay.style.color = "var(--success-color)";
                addMessageToChat(`Segundo documento "${currentPdf2Name}" también está listo.`, "system");
            } catch (error) {
                pdf2StatusDisplay.textContent = "Error al procesar el segundo PDF.";
                pdf2StatusDisplay.style.color = "var(--danger-color)";
                pdf2TextContent = "";
                pdf2UploadInput.value = null;
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ----- Send Question → Backend -----
    async function handleSendQuestion() {
        const question = questionInput.value.trim();
        if (!question || !pdfTextContent || isProcessing) {
            if (!pdfTextContent) addMessageToChat("Por favor, carga un PDF primero.", "system error");
            return;
        }

        addMessageToChat(question, 'user');
        questionInput.value = '';
        isProcessing = true;
        sendButton.disabled = true;
        questionInput.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        sendButtonText.textContent = 'Enviando';
        addMessageToChat("Pensando...", "bot", true);

        const maxLen = 800000;
        const t1 = pdfTextContent.length > maxLen ? pdfTextContent.substring(0, maxLen) + "... (truncado)" : pdfTextContent;
        let prompt = `Documento 1 ("${currentPdfName}"): "${t1}"\n\n`;

        if (pdf2TextContent) {
            const t2 = pdf2TextContent.length > maxLen ? pdf2TextContent.substring(0, maxLen) + "... (truncado)" : pdf2TextContent;
            prompt += `Documento 2 ("${currentPdf2Name}"): "${t2}"\n\n`;
        }

        prompt += `(Instrucción: Para expresiones matemáticas, utiliza SÓLO el formato $$...$$ para bloque y $...$ para texto en línea.)\n\nPregunta: ${question}\n\nRespuesta:`;

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    model: modelSelector.value || 'gemini-search'
                })
            });

            if (!response.ok) {
                let errorBody = "";
                try { errorBody = await response.text(); } catch(e) {}
                throw new Error(`Error del servidor: ${response.status} ${response.statusText}. ${errorBody.substring(0, 200)}`);
            }

            let botResponse = (await response.text()).trim();
            if (!botResponse) botResponse = "La IA no proporcionó una respuesta.";
            updateLastBotMessage(botResponse);

        } catch (error) {
            updateLastBotMessage(`Lo siento, ocurrió un error: ${error.message}. Intenta de nuevo.`);
        } finally {
            isProcessing = false;
            sendButton.disabled = false;
            questionInput.disabled = false;
            loadingSpinner.style.display = 'none';
            sendButtonText.textContent = 'Enviar';
            questionInput.focus();
            downloadPdfBtn.disabled = false;
            downloadHtmlBtn.disabled = false;
        }
    }

    // ----- Chat UI -----
    function addMessageToChat(message, sender, isThinking = false) {
        const el = document.createElement('div');
        el.classList.add(
            sender === 'user' ? 'user-message' :
            sender.includes('system') ? 'system-message' : 'bot-message'
        );
        if (sender.includes('error')) el.classList.add('error');

        if (sender === 'bot' && !isThinking) {
            const processed = message
                .replace(/\\\[/g, '\\\\[').replace(/\\\]/g, '\\\\]')
                .replace(/\\\(/g, '\\\\(').replace(/\\\)/g, '\\\\)');
            const html = marked.parse ? marked.parse(processed) : processed;
            el.innerHTML = `<strong>Chatbot:</strong> <div class="tex2jax_process" style="margin-top:5px;">${html}</div>`;
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([el]).catch(err => console.error(err));
            }
        } else if (sender === 'bot') {
            el.innerHTML = `<strong>Chatbot:</strong> <span>${message}</span>`;
            el.id = "thinking-message";
        } else {
            el.textContent = message;
        }

        chatDisplay.appendChild(el);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function updateLastBotMessage(message) {
        const el = document.getElementById('thinking-message');
        if (el) {
            const processed = message
                .replace(/\\\[/g, '\\\\[').replace(/\\\]/g, '\\\\]')
                .replace(/\\\(/g, '\\\\(').replace(/\\\)/g, '\\\\)');
            const html = marked.parse ? marked.parse(processed) : processed;
            el.innerHTML = `<strong>Chatbot:</strong> <div class="tex2jax_process" style="margin-top:5px;">${html}</div>`;
            el.removeAttribute('id');
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([el]).catch(err => console.error(err));
            }
        } else {
            addMessageToChat(message, 'bot');
        }
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    resetChat();

    // ----- Session Downloads -----
    function getSessionHTML() {
        const clone = chatDisplay.cloneNode(true);
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Sesión de Chat</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.65; padding: 24px; color: #1e293b; background: #f8fafc; }
        h2 { color: #2563eb; } hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        .user-message { background: #2563eb; color: #fff; padding: 10px 14px; border-radius: 10px 10px 3px 10px; margin-bottom: 10px; max-width: 80%; margin-left: auto; text-align: right; }
        .bot-message { background: #f1f5f9; color: #1e293b; padding: 10px 14px; border-radius: 10px 10px 10px 3px; margin-bottom: 10px; max-width: 80%; border: 1px solid #e2e8f0; }
        .system-message { text-align: center; color: #64748b; font-style: italic; margin-bottom: 10px; font-size: 0.85em; }
        pre { background: #1e293b; color: #f1f5f9; padding: 10px; border-radius: 6px; overflow-x: auto; }
        code { background: #e2e8f0; padding: 2px 5px; border-radius: 4px; font-size: 0.87em; }
    </style>
</head>
<body>
    <h2>Sesión de Chat con PDF</h2>
    <p><strong>Archivo 1:</strong> ${currentPdfName || 'Ninguno'}</p>
    ${currentPdf2Name ? `<p><strong>Archivo 2:</strong> ${currentPdf2Name}</p>` : ''}
    <hr>
    <div>${clone.innerHTML}</div>
</body>
</html>`;
    }

    function downloadSessionHtml() {
        const blob = new Blob([getSessionHTML()], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sesion_Chat_${Date.now()}.html`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function downloadSessionPdf() {
        if (typeof html2pdf === 'undefined') { alert('Librería de PDF no cargada.'); return; }
        const element = document.createElement('div');
        element.innerHTML = `<div style="font-family:Arial,sans-serif;padding:20px;">
            <h2 style="color:#2563eb;">Sesión de Chat con ${currentPdfName}</h2>
            <hr style="margin-bottom:20px;">
            ${chatDisplay.innerHTML}
        </div>`;
        element.querySelectorAll('.user-message, .bot-message').forEach(msg => {
            msg.style.cssText = `margin-bottom:15px;padding:10px;border-radius:8px;max-width:100%;border:1px solid #e2e8f0;color:#1e293b;
                background-color:${msg.classList.contains('user-message') ? '#dbeafe' : '#f8fafc'};
                text-align:${msg.classList.contains('user-message') ? 'right' : 'left'};`;
        });
        html2pdf().set({
            margin: 10,
            filename: `Sesion_Chat_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
    }

    // ----- Download Chatbot Clone (usa el backend también) -----
    function downloadChatbot() {
        const defaultSubtitle = currentPdfTitle || currentPdfName.replace(/\.pdf$/i, '');
        const userSubtitle = prompt("Ingresa el subtítulo que deseas para el clon:", defaultSubtitle);
        if (userSubtitle === null) return;

        const selectedModel = modelSelector.value || 'gemini-search';
        const ePdfText = JSON.stringify(pdfTextContent);
        const ePdfName = JSON.stringify(currentPdfName);
        const eModel = JSON.stringify(selectedModel);
        const eSubtitle = JSON.stringify(userSubtitle);

        // Nombre legible del modelo seleccionado
        const modelNames = {
            'openai': 'GPT 5 mini',
            'mistral': 'Mistral 3.2',
            'gemini-search': 'Gemini 2.5 flash',
            'perplexity-fast': 'Perplexity Sonar'
        };
        const modelDisplayName = modelNames[selectedModel] || selectedModel;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot: ${userSubtitle}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"><\/script>
    <script>pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';<\/script>
    <script>
        window.MathJax = {
            tex: { inlineMath: [['$','$'],['\\\\(','\\\\)']], displayMath: [['$$','$$'],['\\\\[','\\\\]']] },
            options: { processHtmlClass: "tex2jax_process", ignoreHtmlClass: "tex2jax_ignore" }
        };
    <\/script>
    <script id="MathJax-script" async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.0/es5/tex-mml-chtml.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=DM+Serif+Display&display=swap" rel="stylesheet">
    <style>
        :root{--primary:#2563eb;--secondary:#64748b;--light:#f8fafc;--dark:#1e293b;--success:#16a34a;--danger:#dc2626;--warning:#d97706;--radius:10px;--font:'DM Sans','Segoe UI',sans-serif;--bg:var(--light);--text:var(--dark);--card:#fff;--border:#e2e8f0;--input:#fff;--iborder:#cbd5e1;--bot-bg:#f1f5f9;--bot-text:var(--dark);--user-bg:var(--primary);--user-text:#fff;--sys-bg:#fefce8;--sys-text:#854d0e;}
        body.dark-mode{--bg:#0f172a;--text:#f1f5f9;--card:#1e293b;--border:#334155;--input:#334155;--iborder:#475569;--bot-bg:#334155;--bot-text:#f1f5f9;--sys-bg:#2d2210;--sys-text:#fcd34d;}
        *,*::before,*::after{box-sizing:border-box;}
        body{font-family:var(--font);margin:0;background:var(--bg);color:var(--text);display:flex;flex-direction:column;min-height:100vh;transition:background .3s,color .3s;font-size:15px;}
         .container{width:92%;max-width:820px;margin:24px auto;padding:24px 28px;background:var(--card);border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);flex-grow:1;display:flex;flex-direction:column;gap:16px;border:1px solid var(--border);}
         header{border-bottom:1px solid var(--border);padding-bottom:16px;}
         .header-branding{display:grid;grid-template-columns:minmax(80px,1fr) auto minmax(80px,1fr);align-items:center;gap:16px;}
         .header-logo{display:block;width:auto;height:64px;max-width:100%;object-fit:contain;}
         .header-logo:last-child{justify-self:end;}
         header h1{font-family:'DM Serif Display',Georgia,serif;color:var(--primary);margin:0 0 3px;font-size:1.8rem;font-weight:400;}
         header h1{text-align:center;}
         header p{margin:0;font-size:.85rem;color:var(--secondary);text-align:center;}
        .toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);flex-wrap:wrap;}
        .model-group{display:flex;align-items:center;gap:8px;background:var(--card);padding:5px 10px;border-radius:6px;border:1px solid var(--border);}
        .model-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--secondary);white-space:nowrap;}
        .model-val{font-size:.88rem;font-weight:600;color:var(--primary);}
        button{background:var(--primary);color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-family:var(--font);font-size:.84rem;font-weight:500;transition:all .2s;}
        button:hover:not(:disabled){background:#1d4ed8;transform:translateY(-1px);}
        button:disabled{background:var(--border)!important;color:var(--secondary)!important;opacity:.6;cursor:not-allowed;transform:none!important;}
        #theme-btn{background:var(--secondary);}
        #theme-btn:hover:not(:disabled){background:#475569;}
         .suggested-questions{padding:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--card);}
         .suggested-questions label{display:block;margin-bottom:8px;font-size:.82rem;font-weight:600;color:var(--secondary);}
         #suggested-question{width:100%;padding:8px 10px;border:1px solid var(--iborder);border-radius:6px;background:var(--input);color:var(--text);font:inherit;font-size:.88rem;}
         #suggested-question:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
        .chat-display{height:360px;overflow-y:auto;border:1px solid var(--iborder);border-radius:var(--radius);padding:12px;background:var(--bg);line-height:1.65;scroll-behavior:smooth;}
        .chat-display::-webkit-scrollbar{width:4px;}.chat-display::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
        .chat-display .user-message,.chat-display .bot-message,.chat-display .system-message{margin-bottom:10px;padding:10px 14px;border-radius:var(--radius);max-width:86%;word-wrap:break-word;}
        .chat-display .user-message{background:var(--user-bg);color:var(--user-text);margin-left:auto;text-align:right;border-bottom-right-radius:3px;}
        .chat-display .bot-message{background:var(--bot-bg);color:var(--bot-text);border:1px solid var(--border);border-bottom-left-radius:3px;}
        .chat-display .bot-message strong{color:var(--primary);}
        .chat-display .bot-message p{margin:0 0 8px;}.chat-display .bot-message p:last-child{margin:0;}
        .chat-display .bot-message pre{background:var(--dark);color:var(--light);padding:10px;border-radius:6px;overflow-x:auto;}
        .chat-display .bot-message code{background:rgba(37,99,235,.08);padding:2px 5px;border-radius:4px;font-size:.86em;}
        body.dark-mode .chat-display .bot-message code{background:rgba(255,255,255,.1);}
        .chat-display .system-message{background:var(--sys-bg);color:var(--sys-text);text-align:center;font-style:italic;font-size:.84rem;max-width:100%;border-radius:6px;}
        .chat-display .system-message.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}
        .input-area{display:flex;gap:10px;align-items:flex-end;}
        #question-input{flex-grow:1;padding:10px 14px;border:1px solid var(--iborder);border-radius:var(--radius);font-family:var(--font);font-size:.93rem;resize:none;background:var(--input);color:var(--text);transition:all .2s;line-height:1.5;}
        #question-input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
        #send-button{background:var(--success);padding:10px 22px;display:flex;align-items:center;gap:8px;height:44px;font-weight:600;font-size:.93rem;}
        #send-button:hover:not(:disabled){background:#15803d;}
        .loader{border:2.5px solid rgba(255,255,255,.4);border-top:2.5px solid #fff;border-radius:50%;width:14px;height:14px;animation:spin .8s linear infinite;display:none;}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        footer{text-align:center;padding:12px;background:#1e293b;color:rgba(255,255,255,.6);font-size:.76rem;margin-top:20px;}
        footer strong{color:rgba(255,255,255,.9);}
         @media(max-width:600px){.header-branding{grid-template-columns:52px minmax(0,1fr) 52px;gap:8px;}.header-logo{height:48px;}header h1{font-size:1.45rem;}.input-area{flex-direction:column;}#send-button{width:100%;justify-content:center;}}
    </style>
</head>
<body>
<div class="container">
     <header>
         <div class="header-branding">
             <img src="logoPB1.png" alt="Logo Pascual Bravo" class="header-logo">
             <h1>Chatbot PDF Interactivo</h1>
             <img src="logo_escuela.png" alt="Logo de la escuela" class="header-logo">
         </div>
         <p>${userSubtitle}</p>
    </header>
    <div class="toolbar">
        <div class="model-group">
            <span class="model-label">Modelo IA</span>
            <span class="model-val">${modelDisplayName}</span>
        </div>
        <button id="theme-btn" title="Cambiar tema">🌓</button>
        <div style="display:flex;gap:8px;">
            <button id="download-html-btn" title="Descargar historial en HTML">📥 HTML</button>
            <button id="download-pdf-btn" title="Descargar historial en PDF">📥 PDF</button>
        </div>
    </div>
    <div class="suggested-questions">
        <label for="suggested-question">Preguntas sugeridas sobre este PDF</label>
        <select id="suggested-question">
            <option value="">Selecciona una pregunta para comenzar...</option>
            <option>¿Cuál es el tema principal del documento?</option>
            <option>¿Cuáles son las ideas o conclusiones más importantes?</option>
            <option>¿Puedes resumir el contenido del documento?</option>
            <option>¿Qué conceptos clave se explican en el documento?</option>
            <option>¿Qué datos, fechas o cifras relevantes aparecen?</option>
            <option>¿Qué recomendaciones o pasos propone el documento?</option>
        </select>
    </div>
    <div id="chat-display" class="chat-display"></div>
    <div class="input-area">
        <textarea id="question-input" rows="2" placeholder="Escribe tu pregunta aquí..."></textarea>
        <button id="send-button">
            <span id="send-button-text">Enviar</span>
            <div class="loader" id="loading-spinner"></div>
        </button>
    </div>
</div>
<footer><p>Diseñado por <strong>Juan Guillermo Rivera Berrío</strong> · IA agéntica Antigravity</p></footer>
<script>
    const BACKEND_URL = 'https://node.proyectodescartes.org/api/ia/text';
    const PDF_TEXT = ${ePdfText};
    const PDF_NAME = ${ePdfName};
     const MODEL = ${eModel};

     let isProcessing = false;

    const chatDisplay = document.getElementById('chat-display');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');
    const sendButtonText = document.getElementById('send-button-text');
    const loadingSpinner = document.getElementById('loading-spinner');
     const themeBtn = document.getElementById('theme-btn');
     const suggestedQuestion = document.getElementById('suggested-question');

    // Theme
    function applyTheme(t) { document.body.classList.toggle('dark-mode', t==='dark'); themeBtn.textContent = t==='dark' ? '☀️' : '🌓'; }
    themeBtn.addEventListener('click', () => { const n = document.body.classList.contains('dark-mode') ? 'light' : 'dark'; applyTheme(n); localStorage.setItem('theme',n); });
    applyTheme(localStorage.getItem('theme') || 'light');

    // Descargar historial
    function buildHistorialHTML() {
        const msgs = chatDisplay.querySelectorAll('.user-message, .bot-message, .system-message');
        if (!msgs.length) return null;
        const rows = Array.from(msgs).map(m => {
            let tipo = 'Sistema', bg = '#fefce8', color = '#854d0e', justify = 'center', border = '';
            if (m.classList.contains('user-message')) { tipo = 'Tú'; bg = '#2563eb'; color = '#fff'; justify = 'flex-end'; }
            else if (m.classList.contains('bot-message')) { tipo = 'Bot'; bg = '#f1f5f9'; color = '#1e293b'; justify = 'flex-start'; border = 'border:1px solid #e2e8f0;'; }
            return '<div style="display:flex;justify-content:' + justify + ';margin-bottom:10px;"><div style="background:' + bg + ';color:' + color + ';padding:10px 14px;border-radius:10px;max-width:80%;word-wrap:break-word;' + border + '"><small style="opacity:.65;font-size:.75rem;display:block;margin-bottom:4px;">' + tipo + '</small>' + m.innerHTML + '</div></div>';
        }).join('');
        return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Historial - Chatbot</title><style>body{font-family:Segoe UI,sans-serif;background:#f8fafc;color:#1e293b;margin:0;padding:24px;}.header{text-align:center;margin-bottom:24px;border-bottom:1px solid #e2e8f0;padding-bottom:16px;}h1{color:#2563eb;font-size:1.5rem;margin:0 0 4px;}p{margin:0;color:#64748b;font-size:.85rem;}.chat{max-width:760px;margin:0 auto;}pre{background:#1e293b;color:#f1f5f9;padding:10px;border-radius:6px;overflow-x:auto;}code{background:rgba(37,99,235,.08);padding:2px 5px;border-radius:4px;font-size:.86em;}</style></head><body><div class="header"><h1>📄 Historial del chat</h1><p>Exportado el ' + new Date().toLocaleString('es-CO') + '</p></div><div class="chat">' + rows + '</div></body></html>';
    }
    document.getElementById('download-html-btn').addEventListener('click', () => {
        const html = buildHistorialHTML();
        if (!html) { alert('El historial está vacío.'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], {type: 'text/html;charset=utf-8'}));
        a.download = 'historial-chatbot-' + Date.now() + '.html';
        a.click(); URL.revokeObjectURL(a.href);
    });
    document.getElementById('download-pdf-btn').addEventListener('click', () => {
        const html = buildHistorialHTML();
        if (!html) { alert('El historial está vacío.'); return; }
        const win = window.open('', '_blank');
        win.document.write(html + '<scr' + 'ipt>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/scr' + 'ipt>');
        win.document.close();
    });

     suggestedQuestion.addEventListener('change', () => {
         if (suggestedQuestion.value) {
             questionInput.value = suggestedQuestion.value;
             questionInput.focus();
         }
     });

    // Chat
    function addMsg(message, sender, isThinking = false) {
        const el = document.createElement('div');
        el.classList.add(sender === 'user' ? 'user-message' : sender.includes('system') ? 'system-message' : 'bot-message');
        if (sender.includes('error')) el.classList.add('error');
        if (sender === 'bot' && !isThinking) {
            const pm = message.replace(/\\\[/g,'\\\\[').replace(/\\\]/g,'\\\\]').replace(/\\\(/g,'\\\\(').replace(/\\\)/g,'\\\\)');
            el.innerHTML = '<strong>Chatbot:</strong> <div class="tex2jax_process" style="margin-top:5px;">' + (marked.parse ? marked.parse(pm) : pm) + '</div>';
            if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([el]).catch(e => console.error(e));
        } else if (sender === 'bot') {
            el.innerHTML = '<strong>Chatbot:</strong> <span>' + message + '</span>'; el.id = 'thinking-msg';
        } else { el.textContent = message; }
        chatDisplay.appendChild(el); chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }
    function updateLastMsg(message) {
        const el = document.getElementById('thinking-msg');
        const pm = message.replace(/\\\[/g,'\\\\[').replace(/\\\]/g,'\\\\]').replace(/\\\(/g,'\\\\(').replace(/\\\)/g,'\\\\)');
        const html = marked.parse ? marked.parse(pm) : pm;
        if (el) { el.innerHTML = '<strong>Chatbot:</strong> <div class="tex2jax_process" style="margin-top:5px;">' + html + '</div>'; el.removeAttribute('id'); if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([el]).catch(e => console.error(e)); }
        else addMsg(message, 'bot');
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    async function sendQuestion() {
        const question = questionInput.value.trim();
        if (!question || isProcessing) return;
        addMsg(question, 'user'); questionInput.value = '';
        isProcessing = true; sendButton.disabled = true; questionInput.disabled = true;
        loadingSpinner.style.display = 'inline-block'; sendButtonText.textContent = 'Enviando';
        addMsg('Pensando...', 'bot', true);
        const maxLen = 800000;
        const t1 = PDF_TEXT.length > maxLen ? PDF_TEXT.substring(0, maxLen) + '... (truncado)' : PDF_TEXT;
        let prompt = 'Documento 1 ("' + PDF_NAME + '"): "' + t1 + '"\\n\\n';
         prompt += '(Instrucción: Para expresiones matemáticas, utiliza SÓLO $$...$$ para bloque y $...$ para texto en línea.)\\n\\nPregunta: ' + question + '\\n\\nRespuesta:';
        try {
            const res = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt, model: MODEL })
            });
            if (!res.ok) { let e=''; try{e=await res.text();}catch(_){} throw new Error('Error del servidor: ' + res.status + ' ' + res.statusText + '. ' + e.substring(0,200)); }
            const text = (await res.text()).trim();
            updateLastMsg(text || 'La IA no proporcionó una respuesta.');
        } catch(err) { updateLastMsg('Lo siento, ocurrió un error: ' + err.message); }
        finally {
            isProcessing = false; sendButton.disabled = false; questionInput.disabled = false;
            loadingSpinner.style.display = 'none'; sendButtonText.textContent = 'Enviar'; questionInput.focus();
        }
    }
    sendButton.addEventListener('click', sendQuestion);
    questionInput.addEventListener('keypress', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); } });
     addMsg('Documento "' + PDF_NAME + '" listo. ¡Puedes empezar a preguntar!', 'system');
     window.scrollTo(0, 0);
<\/script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Chatbot_${currentPdfName.replace(/\.pdf$/i, '')}.html`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

});
