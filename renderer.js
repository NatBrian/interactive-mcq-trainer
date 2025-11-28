/**
 * Content Renderer Module
 * Handles Markdown parsing, HTML sanitization, and LaTeX rendering.
 * Designed to be loaded via <script> tag for local file compatibility.
 */

const ContentRenderer = {
    /**
     * Heuristically converts (...) and [...] to LaTeX delimiters if they contain math symbols.
     */
    preprocessMath: function (text) {
        if (!text) return text;

        // 1. Mask code blocks to prevent accidental LaTeX conversion
        // Matches fenced code blocks (```...```) and inline code (`...`)
        // We use a regex that captures the backticks to handle variable length (`, ``, ```, etc.)
        const codeBlocks = [];
        const maskRegex = /(`{1,})[\s\S]*?\1/g;

        const maskedText = text.replace(maskRegex, (match) => {
            codeBlocks.push(match);
            return `@@CODE_BLOCK_${codeBlocks.length - 1}@@`;
        });

        let result = '';
        let stack = []; // Stores { char: '(', index: 0 }
        let lastIndex = 0;

        const mathSymbols = /[=\\_\^><]/; // Heuristic: contains =, \, _, ^, >, <

        for (let i = 0; i < maskedText.length; i++) {
            const char = maskedText[i];

            // Skip if escaped (preceded by backslash)
            // This prevents breaking explicit LaTeX like \( ... \) or \[ ... \]
            if (i > 0 && (maskedText[i - 1] === '\\')) {
                continue;
            }

            if (char === '(' || char === '[') {
                if (stack.length === 0) {
                    // Start of a top-level group
                    result += maskedText.substring(lastIndex, i);
                    lastIndex = i;
                }
                stack.push({ char, index: i });
            } else if (char === ')' || char === ']') {
                if (stack.length > 0) {
                    const last = stack[stack.length - 1];
                    if ((last.char === '(' && char === ')') || (last.char === '[' && char === ']')) {
                        stack.pop();

                        if (stack.length === 0) {
                            // End of a top-level group
                            const content = maskedText.substring(last.index + 1, i);

                            // Check if it looks like math AND doesn't already have LaTeX delimiters
                            // Matches \(, \[, $$, \begin, or \\(, \\[ (escaped versions)
                            const isExplicitLatex = /^\s*((\\{1,2})(\[|\(|begin)|\$\$)/.test(content);

                            if (mathSymbols.test(content) && !isExplicitLatex) {
                                // Convert to LaTeX delimiter
                                const open = last.char === '(' ? '\\(' : '\\[';
                                const close = char === ')' ? '\\)' : '\\]';
                                result += open + content + close;
                            } else {
                                // Keep as is
                                result += maskedText.substring(last.index, i + 1);
                            }
                            lastIndex = i + 1;
                        }
                    } else {
                        // Mismatched, ignore or handle? 
                        // For simplicity, if we find mismatch, we might just reset or ignore.
                        // But let's just continue and hope it balances later or is just text.
                    }
                }
            }
        }

        result += maskedText.substring(lastIndex);

        // 2. Restore code blocks
        codeBlocks.forEach((block, index) => {
            // Use split/join to replace all instances (safe for special chars in block)
            result = result.split(`@@CODE_BLOCK_${index}@@`).join(block);
        });

        return result;
    },

    /**
     * Renders Markdown and LaTeX content into a target element.
     * @param {HTMLElement} element - The target DOM element.
     * @param {string} text - The raw text content (Markdown + LaTeX).
     */
    render: function (element, text) {
        if (!element) return;
        if (!text) {
            element.textContent = '';
            return;
        }

        try {
            // 0. Preprocess for implicit math (...) and [...]
            const preprocessedText = this.preprocessMath(text);

            // Protect LaTeX delimiters using placeholders
            // This avoids issues with marked consuming backslashes
            const placeholders = {
                '\\(': '@@LATEX_INLINE_OPEN@@',
                '\\)': '@@LATEX_INLINE_CLOSE@@',
                '\\[': '@@LATEX_DISPLAY_OPEN@@',
                '\\]': '@@LATEX_DISPLAY_CLOSE@@'
            };

            let protectedText = preprocessedText;
            // Replace delimiters with placeholders
            // We use split/join for simple global replacement without regex escape issues
            protectedText = protectedText.split('\\(').join(placeholders['\\(']);
            protectedText = protectedText.split('\\)').join(placeholders['\\)']);
            protectedText = protectedText.split('\\[').join(placeholders['\\[']);
            protectedText = protectedText.split('\\]').join(placeholders['\\]']);

            // 1. Parse Markdown to HTML
            // Enable line breaks for newlines
            let rawHtml = marked.parse(protectedText, { breaks: true });

            // Remove wrapping <p> tags if marked added them to a single line
            // This prevents nested <p> tags when we inject into an element that might already be a <p> or similar
            if (rawHtml.startsWith('<p>') && rawHtml.endsWith('</p>\n')) {
                rawHtml = rawHtml.substring(3, rawHtml.length - 5);
            }

            // 2. Restore delimiters
            rawHtml = rawHtml.split(placeholders['\\(']).join('\\(');
            rawHtml = rawHtml.split(placeholders['\\)']).join('\\)');
            rawHtml = rawHtml.split(placeholders['\\[']).join('\\[');
            rawHtml = rawHtml.split(placeholders['\\]']).join('\\]');

            // 3. Sanitize HTML
            // 'DOMPurify' is provided by the global library
            const cleanHtml = DOMPurify.sanitize(rawHtml);

            // 4. Inject HTML
            element.innerHTML = cleanHtml;

            // 5. Render LaTeX
            // 'renderMathInElement' is provided by the KaTeX auto-render extension
            if (window.renderMathInElement) {
                renderMathInElement(element, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        } catch (error) {
            console.error("Error rendering content:", error);
            // Fallback to safe text rendering
            element.textContent = text;
        }
    }
};
