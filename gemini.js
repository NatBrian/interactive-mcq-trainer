/**
 * Gemini AI Integration Module
 * Handles API calls to Google Gemini for MCQ generation
 */

// Session-only API key storage (not persisted)
let geminiApiKey = '';

// DOM Elements (initialized on load)
const geminiElements = {};

// Initialize Gemini module
function initGemini() {
    // Get DOM elements
    Object.assign(geminiElements, {
        toggle: document.getElementById('gemini-toggle'),
        content: document.getElementById('gemini-content'),
        chevron: document.getElementById('gemini-chevron'),
        apiKeyInput: document.getElementById('gemini-api-key'),
        toggleKeyBtn: document.getElementById('toggle-key-visibility'),
        modelSelect: document.getElementById('gemini-model'),
        sourceFile: document.getElementById('source-file'),
        sourceStatus: document.getElementById('source-status'),
        questionCount: document.getElementById('question-count'),
        questionType: document.getElementById('question-type'),
        difficultyLevel: document.getElementById('difficulty-level'),
        generateBtn: document.getElementById('generate-btn'),
        loadingDiv: document.getElementById('gemini-loading'),
        loadingMessage: document.getElementById('loading-message'),
        errorDiv: document.getElementById('gemini-error')
    });

    // Event listeners
    geminiElements.toggle?.addEventListener('click', toggleGeminiSection);
    geminiElements.toggleKeyBtn?.addEventListener('click', toggleKeyVisibility);
    geminiElements.sourceFile?.addEventListener('change', handleSourceFileSelect);
    geminiElements.generateBtn?.addEventListener('click', generateQuestions);
    geminiElements.apiKeyInput?.addEventListener('input', (e) => {
        geminiApiKey = e.target.value.trim();
    });

    // Clear API key on page unload
    window.addEventListener('beforeunload', () => {
        geminiApiKey = '';
        if (geminiElements.apiKeyInput) geminiElements.apiKeyInput.value = '';
    });
}

// Toggle Gemini section visibility
function toggleGeminiSection() {
    const isHidden = geminiElements.content.classList.contains('hidden');
    if (isHidden) {
        geminiElements.content.classList.remove('hidden');
        geminiElements.chevron.style.transform = 'rotate(180deg)';
    } else {
        geminiElements.content.classList.add('hidden');
        geminiElements.chevron.style.transform = 'rotate(0deg)';
    }
}

// Toggle API key visibility
function toggleKeyVisibility() {
    const input = geminiElements.apiKeyInput;
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Handle source file selection
function handleSourceFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
        geminiElements.sourceStatus.textContent = '';
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    geminiElements.sourceStatus.textContent = `${file.name} (${sizeMB} MB)`;

    if (file.size > 50 * 1024 * 1024) {
        showGeminiError('File size exceeds 50MB limit. Please use a smaller file.');
    } else {
        hideGeminiError();
    }
}

// Show error message
function showGeminiError(message) {
    geminiElements.errorDiv.textContent = message;
    geminiElements.errorDiv.classList.remove('hidden');
}

// Hide error message
function hideGeminiError() {
    geminiElements.errorDiv.classList.add('hidden');
}

// Show loading state
function showLoading(message = 'Processing your source material') {
    geminiElements.loadingMessage.textContent = message;
    geminiElements.loadingDiv.classList.remove('hidden');
    geminiElements.generateBtn.disabled = true;
}

// Hide loading state
function hideLoading() {
    geminiElements.loadingDiv.classList.add('hidden');
    geminiElements.generateBtn.disabled = false;
}

// Read file as base64
async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Get MIME type
function getMimeType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'md': 'text/markdown'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// Build prompt for Gemini
function buildPrompt(count, type, difficulty) {
    // Determine type distribution
    let typeDistribution;
    if (type === 'mixed') {
        typeDistribution = `**70% Single-correct-answer MCQs** → mark as \`[Single]\`
**30% Multiple-correct-answer MCQs** → mark as \`[Multiple] (Select all that apply)\``;
    } else if (type === 'single') {
        typeDistribution = `**100% Single-correct-answer MCQs** → mark as \`[Single]\`
(Each question has exactly one correct option)`;
    } else {
        typeDistribution = `**100% Multiple-correct-answer MCQs** → mark as \`[Multiple] (Select all that apply)\`
(Each question has 2-4 correct options)`;
    }

    // Determine difficulty level
    let difficultyGuidance;
    if (difficulty === 'mixed') {
        difficultyGuidance = `Vary the difficulty level across questions, including:
- Some requiring deep conceptual understanding and multi-step reasoning
- Some testing nuanced distinctions and edge cases
- Some involving scenario-based decision-making`;
    } else if (difficulty === 'hard') {
        difficultyGuidance = `All questions must be **advanced/Master's-level**, emphasizing:
- Deep conceptual understanding and multi-step reasoning
- Nuanced distinctions and edge cases
- Algorithmic complexity, convergence, assumptions, variants, limitations
- Trade-offs between methods and scenario-based decision-making
- Combining multiple ideas from across the material
Questions must NOT be answerable by shallow recall or simple lookup.`;
    } else if (difficulty === 'medium') {
        difficultyGuidance = `Questions should be **intermediate-level**, requiring:
- Solid understanding of core concepts
- Ability to apply knowledge to scenarios
- Recognition of relationships between concepts
- Some multi-step reasoning`;
    } else {
        difficultyGuidance = `Questions should be **foundational-level**, focusing on:
- Core concepts and definitions
- Basic understanding and recall
- Fundamental principles
- Straightforward application`;
    }

    return `**Act as an expert exam setter for an Academic Course**

Your task is to generate **a single text file** based on the provided source material, consisting of 2 parts:

1. **Exam Questions**
2. **Exam Answers**

You will receive **one input file** (PDF/TXT/MD containing academic course material). This is the *primary and authoritative* content source.

---

# **Your Objectives**

### **1. Read and analyze the material thoroughly**

Treat the provided file as the *sole and primary* source.
All questions must reflect its concepts, depth, notation, assumptions, and examples.

---

### **2. Produce ${count} MCQs**

**Distribution across topics:**
- Determine the number of main topics/sections in the material
- Divide the ${count} questions **equally** across those topics

---

### **3. Difficulty & Cognitive Level**

${difficultyGuidance}

**All distractors must be plausible**—avoid obviously false or trivial options.

**Correct answer letters (A/B/C/D) must be evenly and randomly distributed** across the entire set.

---

### **4. Question Types**

${typeDistribution}

**Single-correct questions:**
- Mark as \`[Single]\`
- Exactly one correct option
- All four choices should be subtle, tricky, and conceptually close
  (e.g., differing assumptions, boundary conditions, detail-level formulations)

**Multiple-correct questions:**
- Mark as \`[Multiple] (Select all that apply)\`
- 2 to 4 correct options
- All correct options must be clearly defendable
- The incorrect options should fail for specific, subtle reasons

---

### **5. Coverage Requirements**

Across the ${count} questions, ensure representation of:

- Core concepts and definitions
- Mathematical/technical details
- Algorithmic steps and variants (if applicable)
- Convergence and complexity analysis (if applicable)
- Assumptions, prerequisites, and limitations
- Proof ideas (not full proofs, if applicable)
- Comparisons between related methods/algorithms
- Realistic application scenarios requiring selection of appropriate tools
- Subtle edge cases, failure conditions, and design trade-offs
- Examples or use-cases described or implied in the material

---

# **Output Format (STRICT)**

**IMPORTANT:** Do NOT wrap the entire output in markdown code blocks (e.g. \`\`\`json or \`\`\`text). Provide the raw text only.

## **Part 1 — Questions**

Start the output exactly with the line:
\`Part 1 - Questions\`

List questions **1 through ${count}** using this exact format:

\`\`\`
Q1 [Single]: <question stem>
A. <option A>
B. <option B>
C. <option C>
D. <option D>
\`\`\`

For multiple-answer questions:

\`\`\`
Q2 [Multiple] (Select all that apply): <question stem>
A. <option A>
B. <option B>
C. <option C>
D. <option D>
\`\`\`

Continue up to **Q${count}**.

**Do NOT include answers in Part 1.**

---

## **Part 2 — Answers**

Start the second section exactly with the line:
\`Part 2 - Answers\`

Then, for each question, use this format:

**Single-answer example:**
\`\`\`
1. Correct: C
Explanation: <2-5 sentences highlighting the key concept from the material, and briefly why the other options are incorrect.>
\`\`\`

**Multiple-answer example:**
\`\`\`
23. Correct: A, C, D
Explanation: <defend each correct choice and briefly state why each incorrect choice fails.>
\`\`\`

---

# **Style Requirements**

- Do **not** reference slide numbers, page numbers, or file names
- Use precise, formal technical language appropriate for the subject matter
- Explanations should be concise (2-5 sentences), rigorous, and directly grounded in the material
- Include **nothing** outside the two required parts

### **Formatting for Math and Code**
- **Math:** Use LaTeX syntax.
  - Inline math: \`\\( ... \\)\` (e.g., \`\\( E = mc^2 \\)\`)
  - Display math: \`\\[ ... \\]\` (e.g., \`\\[ \\sum_{i=1}^n x_i \\]\`)
- **Code:** Use Markdown code blocks with language specification. **Do NOT ESCAPE FOR SPECIAL CHAR within CODE SYNTAX, Do not use backslash to escape special characters**
  - Example block code:
    \`\`\`python
    print("Hello")
    \`\`\`
  - Example inline code: \`print("Hello")\`
---

**CRITICAL:** Ensure the output format matches exactly:
- Do NOT use markdown code blocks for the whole response.
- Part 1 starts with "Part 1 - Questions"
- Part 2 starts with "Part 2 - Answers"
- Use [Single] or [Multiple] tags after each Q number
- Answer format: "1. Correct: A" or "2. Correct: A, C, D"
- Each answer must have an Explanation line`;
}

// Call Gemini API
async function callGeminiAPI(model, prompt, fileData, mimeType) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const requestBody = {
        contents: [{
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: fileData
                    }
                },
                { text: prompt }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Parse Gemini response
function parseGeminiResponse(response) {
    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response generated. Please try again.');
    }

    const text = response.candidates[0].content.parts[0].text;
    return text;
}

// Generate questions
async function generateQuestions() {
    try {
        // Validation
        if (!geminiApiKey) {
            showGeminiError('Please enter your Gemini API key.');
            return;
        }

        const file = geminiElements.sourceFile.files[0];
        if (!file) {
            showGeminiError('Please select a source material file.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            showGeminiError('File size exceeds 50MB limit.');
            return;
        }

        hideGeminiError();
        showLoading('Reading source material...');

        // Read file
        const base64Data = await readFileAsBase64(file);
        const mimeType = getMimeType(file);

        // Get options
        const count = parseInt(geminiElements.questionCount.value) || 10;
        const type = geminiElements.questionType.value;
        const difficulty = geminiElements.difficultyLevel.value;
        const model = geminiElements.modelSelect.value;

        // Build prompt
        const prompt = buildPrompt(count, type, difficulty);

        // Call API
        showLoading('Generating questions with Gemini AI...');
        const response = await callGeminiAPI(model, prompt, base64Data, mimeType);

        // Parse response
        const generatedText = parseGeminiResponse(response);

        // Process the generated text directly with existing parsers
        showLoading('Processing generated questions...');
        await processGeneratedText(generatedText);

        hideLoading();
        showGeminiError('✅ Questions generated successfully! Scroll down to start practicing.');
        setTimeout(hideGeminiError, 5000);

    } catch (error) {
        hideLoading();
        console.error('Gemini Error:', error);
        showGeminiError(`Error: ${error.message}`);
    }
}

// Clean generated text (remove markdown code blocks)
function cleanGeneratedText(text) {
    // Remove start code block
    text = text.replace(/^```[a-z]*\s*/i, '');
    // Remove end code block
    text = text.replace(/```\s*$/, '');
    return text.trim();
}

// Process generated text
async function processGeneratedText(text) {
    text = cleanGeneratedText(text);

    // Split into questions and answers parts
    const parts = text.split(/(?:Part 2.*?-.*?Answers|Answer Key and Explanations)/i);

    if (parts.length < 2) {
        throw new Error('Generated text format is incorrect. Please try again.');
    }

    const questionsPart = parts[0].replace(/Part 1.*?-.*?Questions/i, '').trim();
    const answersPart = parts[1].trim();

    // Parse using existing functions
    const parsedQuestions = parseQuestionsText(questionsPart);
    const parsedAnswers = parseAnswersText(answersPart);

    if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found in generated text.');
    }

    if (parsedAnswers.size === 0) {
        throw new Error('No valid answers found in generated text.');
    }

    // Update state
    state.questions = parsedQuestions;
    state.answersMap = parsedAnswers;

    // Render
    processAndRender();
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGemini);
} else {
    initGemini();
}
