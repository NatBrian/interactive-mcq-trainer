# Interactive MCQ Trainer

A minimal, elegant single-page web application for practicing multiple-choice questions. Built with vanilla HTML, CSS (Tailwind), and JavaScript. Runs entirely in the browser with no backend required.

![demo.gif](demo.gif)

## Features

-   **Client-Side Only**: No server, no installation. Just open `index.html`.
-   **File Upload**: Drag and drop your Questions and Answers text files.
-   **Smart Parsing**: Automatically detects Single Choice vs Multiple Choice questions.
-   **Interactive Feedback**:
    -   **Single Choice**: Immediate feedback with explanations.
    -   **Multiple Choice**: "Progressive reveal" for correct answers; immediate failure for incorrect ones.
-   **Live Scoring**: Tracks total, correct, incorrect, and percentage.
-   **Review & Export**: View a detailed summary of incorrect answers and export results to JSON.
-   **Gemini AI Generation**: Generate custom MCQs from your own study materials (PDF/TXT/MD) using Google's Gemini Pro models.


## Feature Comparison vs NotebookLM

| **Feature**                              | **This MCQ Trainer**                                                    | **NotebookLM**                                |
| ---------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| **Multiple-Answer Questions**            | ✔️ Supports full multi-select logic with progressive reveal              | ❌ Only single-answer MCQs                     |
| **Number of Questions Generated**        | ✔️ Unlimited, fully customizable                                         | ❌ Limited, small standardized sets            |
| **Question Specificity / Precision**     | ✔️ Highly specific, controlled by your input or strict generation config | ❌ Generic, broad questions, less controllable |
| **Difficulty Levels (3 tiers)**          | ✔️ Yes                                                                   | ✔️ Yes                                         |
| **AI Model**                             | ✔️ Gemini, fully in your control                                         | ✔️ Gemini via Google’s interface               |
| **Use Your Own Question + Answer Files** | ✔️ Fully supported and local                                             | ❌ Not supported, AI-only                      |
| **Privacy (Local Mode)**                 | ✔️ 100% local if using your own QA files                                 | ❌ Cloud-based, uploads required               |
| **Interactive Quiz Engine**              | ✔️ Progressive reveal, instant feedback, multi-choice logic              | ❌ Basic answer checking only                  |
| **Live Scoring**                         | ✔️ Correct/incorrect/percentage                                          | ❌ Not supported                               |
| **Review Incorrect Answers**             | ✔️ Full summary view                                                     | ❌ No dedicated review flow                    |
| **Export to JSON**                       | ✔️ Yes                                                                   | ❌ No                                          |
| **Offline Usage**                        | ✔️ Fully offline                                                         | ❌ Requires internet                           |
| **Customization / Control**              | ✔️ Total control over format, parsing, evaluation                        | ❌ Mostly fixed format                         |


## Setup & Usage

1.  **Open the App**: Double-click `index.html` to open it in your web browser.
2.  **Upload Questions**: Click "Select Questions File(s)" and choose your `.txt` file containing questions.
3.  **Upload Answers**: Click "Select Answers File" and choose your `.txt` file containing the answer key.
4.  **Start Practicing**: Questions will appear automatically.

## Gemini AI Generation

1.  **Enter API Key**: You need a Google Gemini API key. The key is stored only in your browser session and is not saved.
2.  **Select Source**: Upload a PDF, text file, or markdown file containing your study material.
3.  **Configure**: Choose the number of questions, difficulty level, and question type (Single/Multiple/Mixed).
4.  **Generate**: Click "Generate Questions". The app will create questions and answers, then automatically load them for you to practice.

## Sample Input Formats

Please use the following formats for your text files.

### Questions File

```text
Questions only

Q1 [Single]: A team trains a shallow logistic regression model on hand‑engineered edge and texture features for image classification, and a deep CNN directly on pixels. Both have access to a very large labeled dataset and sufficient compute. Which is the *most* plausible outcome as data size continues to increase?
A. Logistic regression will eventually match the CNN because more data compensates for limited model capacity.
B. Logistic regression plateaus in performance while the CNN continues to improve as more data is added.
C. Both models plateau at the same accuracy once they perfectly fit the training data.
D. The CNN overfits more and therefore performs worse than logistic regression as data grows.

Q2 [Multiple] (Select all that apply): Which factors contributed *jointly* to the modern resurgence of deep learning after the mid‑2000s?
A. Theoretical proof that shallow models cannot overfit.
B. Availability of large labeled datasets such as ImageNet.
C. Increased computational power via GPUs/TPUs.
D. Algorithmic improvements such as better activations and regularization.
```

### Answers File

```text
Answer Key and Explanations

1. Correct: B
   Explanation: Traditional/shallow models plateau as data grows because of limited capacity, whereas deep networks keep improving with more data, as shown in the performance‑vs‑data curves. 

2. Correct: B, C, D
   Explanation: The resurgence is attributed to large labeled datasets, powerful GPUs/TPUs, and algorithmic advances like better activations and regularization; there was no theorem that shallow models cannot overfit.
```

## Parsing Rules

-   **Questions**: Must start with `Q<number>` or just `<number>`. Optional `[Single]` or `[Multiple]` tags help but are not strictly required (inferred from answer key).
-   **Choices**: Must start with a letter followed by a dot or parenthesis (e.g., `A.`, `B)`).
-   **Answers**: Must match the ID of the question. Format: `<ID>. Correct: <Keys>`.
