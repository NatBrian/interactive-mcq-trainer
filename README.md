# Interactive MCQ Trainer

A minimal, elegant single-page web application for practicing multiple-choice questions. Built with vanilla HTML, CSS (Tailwind), and JavaScript. Runs entirely in the browser with no backend required.

## Features

-   **Client-Side Only**: No server, no installation. Just open `index.html`.
-   **File Upload**: Drag and drop your Questions and Answers text files.
-   **Smart Parsing**: Automatically detects Single Choice vs Multiple Choice questions.
-   **Interactive Feedback**:
    -   **Single Choice**: Immediate feedback with explanations.
    -   **Multiple Choice**: "Progressive reveal" for correct answers; immediate failure for incorrect ones.
-   **Live Scoring**: Tracks total, correct, incorrect, and percentage.
-   **Review & Export**: View a detailed summary of incorrect answers and export results to JSON.

## Setup & Usage

1.  **Open the App**: Double-click `index.html` to open it in your web browser.
2.  **Upload Questions**: Click "Select Questions File(s)" and choose your `.txt` file containing questions.
3.  **Upload Answers**: Click "Select Answers File" and choose your `.txt` file containing the answer key.
4.  **Start Practicing**: Questions will appear automatically.

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
