// LocalStorage management
const STORAGE_KEY = 'scientific_articles_data';
const MAPPING_KEY = 'field_mapping';

function saveArticles(articles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function getArticles() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveFieldMapping(mapping) {
    localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
}

function getFieldMapping() {
    const data = localStorage.getItem(MAPPING_KEY);
    return data ? JSON.parse(data) : null;
}

function clearData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MAPPING_KEY);
}

function hasData() {
    return !!localStorage.getItem(STORAGE_KEY);
}

// Check if we have data, redirect to index if not
if (window.location.pathname.includes('dashboard.html') || 
    window.location.pathname.includes('articles.html') ||
    window.location.pathname.includes('network.html') ||
    window.location.pathname.includes('timeline.html')) {
    if (!hasData()) {
        window.location.href = 'index.html';
    }
}

// Reset button handler
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todos os dados e carregar um novo arquivo?')) {
                clearData();
                window.location.href = 'index.html';
            }
        });
    }
});

// Utility functions
function parseAuthors(authorsString) {
    if (!authorsString) return [];
    return authorsString
        .split(/[;,]/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
}

function parseKeywords(keywordsString) {
    if (!keywordsString) return [];
    return keywordsString
        .split(/[;,]/)
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);
}

function extractAllKeywords(articles) {
    const keywordMap = new Map();
    
    articles.forEach(article => {
        const titleWords = article.title
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3);
        
        const keywords = parseKeywords(article.keywords);
        
        [...titleWords, ...keywords].forEach(keyword => {
            keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
        });
    });
    
    return keywordMap;
}