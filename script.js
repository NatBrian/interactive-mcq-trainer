/**
 * Interactive MCQ Trainer - Main Script
 * Handles file parsing, matching, rendering, and interaction logic.
 */

// --- State Management ---
const state = {
    questions: [], // Array of question objects
    answersMap: new Map(), // Map of ID/Text -> Answer object
    stats: {
        total: 0,
        correct: 0,
        incorrect: 0
    }
};

// --- DOM Elements ---
const elements = {
    questionsFile: document.getElementById('questions-file'),
    answersFile: document.getElementById('answers-file'),
    questionsStatus: document.getElementById('questions-status'),
    answersStatus: document.getElementById('answers-status'),
    parseError: document.getElementById('parse-error'),
    questionsContainer: document.getElementById('questions-container'),
    uploadSection: document.getElementById('upload-section'),
    scoreTotal: document.getElementById('score-total'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreIncorrect: document.getElementById('score-incorrect'),
    scorePercent: document.getElementById('score-percent'),
    resetBtn: document.getElementById('reset-btn'),
    finishBtn: document.getElementById('finish-btn'),
    resultsModal: document.getElementById('results-modal'),
    closeResultsBtn: document.getElementById('close-results-btn'),
    closeResultsIcon: document.getElementById('close-results'),
    exportBtn: document.getElementById('export-btn'),
    summaryTotal: document.getElementById('summary-total'),
    summaryCorrect: document.getElementById('summary-correct'),
    summaryIncorrect: document.getElementById('summary-incorrect'),
    summaryPercent: document.getElementById('summary-percent'),
    wrongAnswersList: document.getElementById('wrong-answers-list'),
    themeToggle: document.getElementById('theme-toggle'),
    iconSun: document.getElementById('icon-sun'),
    iconMoon: document.getElementById('icon-moon')
};

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        updateThemeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcons(false);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    if (isDark) {
        elements.iconSun.classList.remove('hidden');
        elements.iconMoon.classList.add('hidden');
    } else {
        elements.iconSun.classList.add('hidden');
        elements.iconMoon.classList.remove('hidden');
    }
}

// --- Event Listeners ---
initTheme();
elements.themeToggle.addEventListener('click', toggleTheme);
elements.questionsFile.addEventListener('change', handleQuestionsUpload);
elements.answersFile.addEventListener('change', handleAnswersUpload);
elements.resetBtn.addEventListener('click', resetApp);
elements.finishBtn.addEventListener('click', showResults);
elements.closeResultsBtn.addEventListener('click', hideResults);
elements.closeResultsIcon.addEventListener('click', hideResults);
elements.exportBtn.addEventListener('click', exportResults);

// --- File Parsing Logic ---

async function handleQuestionsUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    elements.questionsStatus.textContent = `Reading ${files.length} file(s)...`;
    elements.parseError.classList.add('hidden');

    try {
        let allText = '';
        // Sort files by name to ensure order if numbered (e.g. Part1, Part2)
        files.sort((a, b) => a.name.localeCompare(b.name));

        for (const file of files) {
            allText += await readFile(file) + '\n\n';
        }

        const parsedQuestions = parseQuestionsText(allText);
        if (parsedQuestions.length === 0) {
            throw new Error("No valid questions found. Please check the file format.");
        }

        state.questions = parsedQuestions;
        elements.questionsStatus.textContent = `Loaded ${parsedQuestions.length} questions.`;
        checkReadyToRender();

    } catch (err) {
        showError(`Error parsing questions: ${err.message}`);
        elements.questionsStatus.textContent = 'Error loading questions.';
    }
}

async function handleAnswersUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    elements.answersStatus.textContent = `Reading file...`;
    elements.parseError.classList.add('hidden');

    try {
        const text = await readFile(file);
        const parsedAnswers = parseAnswersText(text);

        if (parsedAnswers.size === 0) {
            throw new Error("No valid answers found. Please check the file format.");
        }

        state.answersMap = parsedAnswers;
        elements.answersStatus.textContent = `Loaded ${parsedAnswers.size} answers.`;
        checkReadyToRender();

    } catch (err) {
        showError(`Error parsing answers: ${err.message}`);
        elements.answersStatus.textContent = 'Error loading answers.';
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

function parseQuestionsText(text) {
    const lines = text.split(/\r?\n/);
    const questions = [];
    let currentQ = null;

    // Regex helpers
    const qStartRegex = /^(?:Q)?(\d+)[\.:\s]*(?:\[(Single|Multiple)\])?\s*(.*)/i;
    const choiceRegex = /^\s*([A-Z])[\.\)]\s*(.*)/;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Check for new Question start
        const qMatch = line.match(qStartRegex);
        if (qMatch) {
            // Save previous question
            if (currentQ) questions.push(currentQ);

            currentQ = {
                id: qMatch[1], // String ID
                text: qMatch[3] || '', // Initial text might be on same line
                explicitType: qMatch[2] ? qMatch[2].toUpperCase() : null,
                choices: [],
                rawLine: i + 1
            };

            // If text was empty on first line, it might be on next lines (handled by default else)
            continue;
        }

        // Check for Choice
        const cMatch = line.match(choiceRegex);
        if (cMatch && currentQ) {
            currentQ.choices.push({
                key: cMatch[1].toUpperCase(),
                text: cMatch[2]
            });
            continue;
        }

        // Append to current question text if it's not a choice and we have a question open
        if (currentQ) {
            if (currentQ.choices.length > 0) {
                // Multiline choice
                currentQ.choices[currentQ.choices.length - 1].text += '\n' + line;
            } else {
                // Multiline question text
                currentQ.text += (currentQ.text ? '\n' : '') + line;
            }
        }
    }
    if (currentQ) questions.push(currentQ);

    return questions;
}

function parseAnswersText(text) {
    const lines = text.split(/\r?\n/);
    const answers = new Map(); // Key: ID (or normalized text start), Value: { correctKeys: [], explanation: '' }
    let currentA = null;

    // Regex helpers
    const aStartRegex = /^(\d+)[\.:\s]*Correct:\s*([A-Z](?:\s*,\s*[A-Z])*)/i;
    const expStartRegex = /^\s*Explanation:\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        const aMatch = line.match(aStartRegex);
        if (aMatch) {
            if (currentA) answers.set(currentA.id, currentA);

            const keys = aMatch[2].split(',').map(k => k.trim().toUpperCase());
            currentA = {
                id: aMatch[1],
                correctKeys: keys,
                explanation: ''
            };
            continue;
        }

        const expMatch = line.match(expStartRegex);
        if (expMatch && currentA) {
            currentA.explanation = expMatch[1];
            continue;
        }

        // Append multiline explanation
        if (currentA) {
            currentA.explanation += (currentA.explanation ? '\n' : '') + line;
        }
    }
    if (currentA) answers.set(currentA.id, currentA);

    return answers;
}

// --- Matching & Processing ---

function checkReadyToRender() {
    if (state.questions.length > 0 && state.answersMap.size > 0) {
        processAndRender();
    }
}

function processAndRender() {
    elements.questionsContainer.innerHTML = '';
    state.stats = { total: 0, correct: 0, incorrect: 0 };
    updateScoreboard();

    state.questions.forEach((q, index) => {
        // 1. Match with Answer
        let answer = state.answersMap.get(q.id);

        if (!answer) {
            console.warn(`No answer found for Q${q.id}`);
            q.status = 'ungraded';
            q.explanation = "No answer key found.";
            q.correctKeys = [];
        } else {
            q.correctKeys = answer.correctKeys;
            q.explanation = answer.explanation;
            q.status = 'unanswered';
        }

        // 2. Determine Type
        if (q.explicitType) {
            q.type = q.explicitType; // SINGLE or MULTIPLE
        } else {
            q.type = q.correctKeys.length > 1 ? 'MULTIPLE' : 'SINGLE';
        }

        // 3. Render
        renderQuestion(q, index);
    });

    state.stats.total = state.questions.length;
    updateScoreboard();
}

// --- Rendering ---

function renderQuestion(q, index) {
    const template = document.getElementById('question-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.question-card');

    // Set IDs for easy access
    card.id = `q-card-${q.id}`;

    // Header
    clone.querySelector('.question-id-badge').textContent = `Q${q.id}`;
    clone.querySelector('.question-type-badge').textContent = q.type === 'SINGLE' ? 'Single Choice' : 'Multiple Choice';
    ContentRenderer.render(clone.querySelector('.question-text'), q.text);

    // Choices
    const choicesContainer = clone.querySelector('.choices-container');
    q.choices.forEach(choice => {
        const label = document.createElement('label');
        label.className = 'choice-label group';
        label.dataset.key = choice.key;

        const inputType = q.type === 'SINGLE' ? 'radio' : 'checkbox';
        const inputName = `q-${q.id}`; // Group radios by question

        label.innerHTML = `
            <input type="${inputType}" name="${inputName}" value="${choice.key}" class="choice-input">
            <span class="flex-1">
                <span class="font-bold text-slate-700 dark:text-slate-300 mr-2">${choice.key}.</span>
                <span class="text-slate-600 dark:text-slate-400 choice-text"></span>
            </span>
        `;

        ContentRenderer.render(label.querySelector('.choice-text'), choice.text);

        // Event Listener
        const input = label.querySelector('input');
        input.addEventListener('change', () => handleInteraction(q, choice.key, input, card));

        choicesContainer.appendChild(label);
    });

    // Explanation (Hidden initially)
    const expContainer = clone.querySelector('.explanation-container');
    expContainer.id = `exp-${q.id}`;
    ContentRenderer.render(expContainer.querySelector('.explanation-text'), q.explanation || "No explanation provided.");

    elements.questionsContainer.appendChild(clone);
}

// --- Interaction Logic ---

function handleInteraction(q, selectedKey, inputElement, cardElement) {
    if (q.status === 'correct' || q.status === 'incorrect') return; // Locked

    const allInputs = cardElement.querySelectorAll('input');
    const allLabels = cardElement.querySelectorAll('.choice-label');
    const expContainer = cardElement.querySelector('.explanation-container');
    const statusIcon = cardElement.querySelector('.status-icon');

    if (q.type === 'SINGLE') {
        // Single Choice Logic
        const isCorrect = q.correctKeys.includes(selectedKey);

        // Lock inputs
        allInputs.forEach(inp => inp.disabled = true);
        allLabels.forEach(lbl => lbl.classList.add('disabled'));

        if (isCorrect) {
            // Correct
            markChoice(cardElement, selectedKey, 'correct');
            q.status = 'correct';
            state.stats.correct++;
            showStatusIcon(statusIcon, 'correct');
        } else {
            // Incorrect
            markChoice(cardElement, selectedKey, 'incorrect');
            // Highlight correct one
            q.correctKeys.forEach(key => markChoice(cardElement, key, 'correct'));
            q.status = 'incorrect';
            state.stats.incorrect++;
            showStatusIcon(statusIcon, 'incorrect');
        }

        // Reveal Explanation
        expContainer.classList.remove('hidden');
        q.userSelectedKeys = [selectedKey];
        updateScoreboard();

    } else {
        // Multiple Choice Logic
        // Get all currently checked inputs
        const checkedInputs = Array.from(allInputs).filter(i => i.checked);
        const checkedKeys = checkedInputs.map(i => i.value);

        // Check if the LATEST click was incorrect
        const isLatestCorrect = q.correctKeys.includes(selectedKey);

        if (!isLatestCorrect) {
            // IMMEDIATE FAILURE
            // Lock inputs
            allInputs.forEach(inp => inp.disabled = true);
            allLabels.forEach(lbl => lbl.classList.add('disabled'));

            // Mark clicked as incorrect
            markChoice(cardElement, selectedKey, 'incorrect');

            // Reveal all correct answers (missed ones)
            q.correctKeys.forEach(key => {
                if (!checkedKeys.includes(key)) {
                    markChoice(cardElement, key, 'missed');
                } else {
                    markChoice(cardElement, key, 'correct');
                }
            });

            q.status = 'incorrect';
            state.stats.incorrect++;
            showStatusIcon(statusIcon, 'incorrect');
            expContainer.classList.remove('hidden');
            q.userSelectedKeys = checkedKeys;
            updateScoreboard();
            return;
        }

        // If we are here, the latest click was CORRECT.
        // Check if ALL correct keys are selected
        const allCorrectSelected = q.correctKeys.every(k => checkedKeys.includes(k));
        const noIncorrectSelected = checkedKeys.every(k => q.correctKeys.includes(k)); // Should be true if we reached here

        if (allCorrectSelected && noIncorrectSelected) {
            // SUCCESS
            // Lock inputs
            allInputs.forEach(inp => inp.disabled = true);
            allLabels.forEach(lbl => lbl.classList.add('disabled'));

            // Mark all selected as correct
            checkedKeys.forEach(key => markChoice(cardElement, key, 'correct'));

            q.status = 'correct';
            state.stats.correct++;
            showStatusIcon(statusIcon, 'correct');
            expContainer.classList.remove('hidden');
            q.userSelectedKeys = checkedKeys;
            updateScoreboard();
        }
    }
}

// --- Helpers ---

function markChoice(card, key, type) {
    // type: 'correct', 'incorrect', 'missed'
    const label = card.querySelector(`.choice-label[data-key="${key}"]`);
    if (!label) return;

    if (type === 'correct') label.classList.add('correct-choice');
    if (type === 'incorrect') label.classList.add('incorrect-choice');
    if (type === 'missed') label.classList.add('missed-correct');
}

function showStatusIcon(container, status) {
    container.innerHTML = status === 'correct'
        ? '<svg class="text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
        : '<svg class="text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
    container.classList.remove('opacity-0');
}

function updateScoreboard() {
    elements.scoreTotal.textContent = state.stats.total;
    elements.scoreCorrect.textContent = state.stats.correct;
    elements.scoreIncorrect.textContent = state.stats.incorrect;

    const answered = state.stats.correct + state.stats.incorrect;
    const percent = answered > 0 ? Math.round((state.stats.correct / answered) * 100) : 0;
    elements.scorePercent.textContent = `${percent}%`;
}

function showError(msg) {
    elements.parseError.textContent = msg;
    elements.parseError.classList.remove('hidden');
}

function resetApp() {
    if (!confirm("Are you sure you want to reset all progress?")) return;
    state.questions = [];
    state.answersMap = new Map();
    state.stats = { total: 0, correct: 0, incorrect: 0 };

    elements.questionsContainer.innerHTML = '';
    elements.questionsFile.value = '';
    elements.answersFile.value = '';
    elements.questionsStatus.textContent = '';
    elements.answersStatus.textContent = '';
    elements.parseError.classList.add('hidden');
    updateScoreboard();
}

// --- Results & Export ---

function showResults() {
    elements.resultsModal.classList.remove('hidden');
    // Trigger reflow for transition
    void elements.resultsModal.offsetWidth;
    elements.resultsModal.classList.add('visible');

    // Update Summary
    elements.summaryTotal.textContent = state.stats.total;
    elements.summaryCorrect.textContent = state.stats.correct;
    elements.summaryIncorrect.textContent = state.stats.incorrect;
    const answered = state.stats.correct + state.stats.incorrect;
    const percent = answered > 0 ? Math.round((state.stats.correct / answered) * 100) : 0;
    elements.summaryPercent.textContent = `${percent}%`;

    // Populate Wrong Answers
    elements.wrongAnswersList.innerHTML = '';
    const wrongQs = state.questions.filter(q => q.status === 'incorrect');

    if (wrongQs.length === 0) {
        elements.wrongAnswersList.innerHTML = '<p class="text-slate-500 dark:text-slate-400 italic text-center py-8">No incorrect answers to review. Great job!</p>';
    } else {
        wrongQs.forEach(q => {
            const div = document.createElement('div');
            div.className = 'bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800';
            div.innerHTML = `
                <div class="flex justify-between mb-2">
                    <span class="font-bold text-red-800 dark:text-red-300">Q${q.id}</span>
                    <span class="text-xs text-red-600 dark:text-red-400 uppercase font-semibold">Incorrect</span>
                </div>
                <div class="text-slate-800 dark:text-slate-200 mb-3 result-q-text"></div>
                <div class="text-sm space-y-1 mb-3">
                    <div class="flex gap-2"><span class="font-semibold text-red-700 dark:text-red-400 w-24">You Selected:</span> <span class="dark:text-slate-300">${(q.userSelectedKeys || []).join(', ')}</span></div>
                    <div class="flex gap-2"><span class="font-semibold text-green-700 dark:text-green-400 w-24">Correct:</span> <span class="dark:text-slate-300">${q.correctKeys.join(', ')}</span></div>
                </div>
                <div class="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-red-100 dark:border-red-900/50">
                    <span class="font-semibold text-slate-700 dark:text-slate-200">Explanation:</span> <div class="inline result-q-exp"></div>
                </div>
            `;
            ContentRenderer.render(div.querySelector('.result-q-text'), q.text);
            ContentRenderer.render(div.querySelector('.result-q-exp'), q.explanation);
            elements.wrongAnswersList.appendChild(div);
        });
    }
}

function hideResults() {
    elements.resultsModal.classList.remove('visible');
    setTimeout(() => {
        elements.resultsModal.classList.add('hidden');
    }, 300);
}

function exportResults() {
    const data = {
        timestamp: new Date().toISOString(),
        stats: state.stats,
        incorrectQuestions: state.questions
            .filter(q => q.status === 'incorrect')
            .map(q => ({
                id: q.id,
                text: q.text,
                userSelected: q.userSelectedKeys,
                correct: q.correctKeys,
                explanation: q.explanation
            }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
