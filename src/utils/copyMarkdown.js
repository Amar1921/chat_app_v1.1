async function copyFormattedMarkdown(markdownText) {
    try {
        // Vérifier si l'API Clipboard est disponible
        if (!navigator.clipboard || !navigator.clipboard.write) {
            return fallbackCopyWithFormatting(markdownText);
        }

        // Nettoyer le markdown et le convertir en HTML
        const htmlContent = markdownToHtml(markdownText);
        const plainText = extractPlainText(markdownText);

        // Créer le contenu HTML avec le bon formatage
        const styledHtml = `
            <div style="font-family: sans-serif; line-height: 1.5;">
                ${htmlContent}
            </div>
        `;

        // Créer les blobs pour les différents formats
        const htmlBlob = new Blob([styledHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });

        // Créer l'objet ClipboardItem
        const clipboardItem = new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
        });

        // Copier dans le presse-papier
        await navigator.clipboard.write([clipboardItem]);
        return true;

    } catch (err) {
        console.warn('Clipboard API failed, trying fallback method:', err);
        return fallbackCopyWithFormatting(markdownText);
    }
}

// Fonction de fallback améliorée avec formatage
function fallbackCopyWithFormatting(markdownText) {
    try {
        // Créer un élément div temporaire avec le contenu formaté
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = markdownToHtml(markdownText);
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.style.wordWrap = 'break-word';

        document.body.appendChild(tempDiv);

        // Sélectionner le contenu
        const range = document.createRange();
        range.selectNodeContents(tempDiv);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Tenter la copie
        const success = document.execCommand('copy');

        // Nettoyer
        selection.removeAllRanges();
        document.body.removeChild(tempDiv);

        if (!success) {
            // Si execCommand échoue, copier au moins le texte brut
            return fallbackCopyPlain(markdownText);
        }

        return true;
    } catch (err) {
        console.warn('Fallback copy failed:', err);
        return fallbackCopyPlain(markdownText);
    }
}

// Copie texte brut en dernier recours
function fallbackCopyPlain(text) {
    const textarea = document.createElement('textarea');
    textarea.value = extractPlainText(text);
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch (err) {
        document.body.removeChild(textarea);
        return false;
    }
}

// Version améliorée de conversion markdown vers HTML
function markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown
        // Échapper les caractères spéciaux HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

        // Titres
        .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')

        // Gras et italique combinés
        .replace(/\*\*\*(.*?)\*\*\*/gm, '<strong><em>$1</em></strong>')
        .replace(/___(.*?)___/gm, '<strong><em>$1</em></strong>')

        // Gras
        .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
        .replace(/__(.*?)__/gm, '<strong>$1</strong>')

        // Italique
        .replace(/\*(.*?)\*/gm, '<em>$1</em>')
        .replace(/_(.*?)_/gm, '<em>$1</em>')

        // Liens
        .replace(/\[(.*?)\]\((.*?)\)/gm, '<a href="$2" target="_blank">$1</a>')

        // Images
        .replace(/!\[(.*?)\]\((.*?)\)/gm, '<img src="$2" alt="$1" style="max-width:100%">')

        // Code inline
        .replace(/`(.*?)`/gm, '<code style="background:#f0f0f0; padding:2px 4px; border-radius:3px;">$1</code>')

        // Blocs de code
        .replace(/```([\s\S]*?)```/gm, '<pre style="background:#f0f0f0; padding:10px; border-radius:5px;"><code>$1</code></pre>')

        // Listes non ordonnées
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\+ (.*$)/gm, '<li>$1</li>')

        // Listes ordonnées
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')

        // Citations
        .replace(/^> (.*$)/gm, '<blockquote style="border-left:4px solid #ccc; margin:0; padding-left:10px;">$1</blockquote>')

        // Retours à la ligne
        .replace(/\n$/gm, '<br>');

    // Grouper les listes
    html = html.replace(/(<li>.*<\/li>\n?)+/g, match => {
        if (match.includes('<ol>')) return match;
        return `<ul>${match}</ul>`;
    });

    return html;
}

function extractPlainText(markdown) {
    if (!markdown) return '';

    return markdown
        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
        .replace(/___(.*?)___/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/`(.*?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/#{1,6} /g, '')
        .replace(/[*\-+>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export default copyFormattedMarkdown;