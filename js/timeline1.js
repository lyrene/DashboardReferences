// Função utilitária: normaliza texto (sem acentos, minúsculas)
function normalizeText(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  // remove acentos
        .replace(/[.,;:!?(){}\[\]"'`´“”‘’]/g, "")  // remove pontuação
        .replace(/\s+/g, " ")             // normaliza múltiplos espaços
        .trim();                          // remove espaços no início/fim
}

document.addEventListener('DOMContentLoaded', () => {
    const articles = getArticles();

    // 1️⃣ Conjunto global de termos (de keywords, incluindo compostos)
    const allTerms = new Set();
    articles.forEach(article => {
        parseKeywords(article.keywords).forEach(k => {
            const term = normalizeText(k);
            if (term.length > 2) allTerms.add(term);
        });
    });

    // 2️⃣ Agrupar artigos por ano
    const yearData = new Map();
    articles.forEach(article => {
        if (!yearData.has(article.year)) yearData.set(article.year, []);
        yearData.get(article.year).push(article);
    });

    const container = document.getElementById('timelineContainer');
    const sortedYears = [...yearData.keys()].sort();

    // 3️⃣ Contar termos por ano
    sortedYears.forEach(year => {
        const yearArticles = yearData.get(year);
        const termCounts = new Map();

        yearArticles.forEach(article => {
            const combinedText = normalizeText(
                `${article.title || ""} ${article.keywords || ""} ${article.abstract || ""}`
            );

            // Contar quantos termos distintos aparecem neste artigo
            allTerms.forEach(term => {
                // Para termos compostos, procurar a frase exata; para termos simples, usar limite de palavra
                const pattern = term.includes(" ")
                    ? new RegExp(`\\b${term}\\b`, "i")
                    : new RegExp(`\\b${term}\\b`, "i");

                if (pattern.test(combinedText)) {
                    termCounts.set(term, (termCounts.get(term) || 0) + 1);
                }
            });
        });

        // 4️⃣ Ordenar e selecionar top 10
        const topTerms = [...termCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // 5️⃣ Renderizar
        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.innerHTML = `
            <h3>${year} <span style="font-size: 0.875rem; font-weight: normal; color: #64748b;">(${yearArticles.length} artigos)</span></h3>
            <div class="keyword-badges">
                ${topTerms.map(([term, count]) => `
                    <span class="badge">
                        ${term}
                        <span class="badge-count">${count}</span>
                    </span>
                `).join('')}
            </div>
        `;
        container.appendChild(yearDiv);
    });
});
