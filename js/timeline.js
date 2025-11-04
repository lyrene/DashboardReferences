document.addEventListener('DOMContentLoaded', () => {
    const articles = getArticles();
    
    // Group by year
    const yearData = new Map();
    
    articles.forEach(article => {
        const year = article.year;
        if (!yearData.has(year)) {
            yearData.set(year, []);
        }
        yearData.get(year).push(article);
    });
    
    // Sort years
    const sortedYears = [...yearData.keys()].sort();
    
    // Build timeline
    const container = document.getElementById('timelineContainer');
    
    sortedYears.forEach(year => {
        const yearArticles = yearData.get(year);
        const keywordMap = new Map();
        
        yearArticles.forEach(article => {
            const titleWords = article.title
                .toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 3);
            
            const keywords = parseKeywords(article.keywords);
            
            [...titleWords, ...keywords].forEach(keyword => {
                keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
            });
        });
        
        const topKeywords = [...keywordMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.innerHTML = `
            <h3>${year} <span style="font-size: 0.875rem; font-weight: normal; color: #64748b;">(${yearArticles.length} artigos)</span></h3>
            <div class="keyword-badges">
                ${topKeywords.map(([keyword, count]) => `
                    <span class="badge">
                        ${keyword}
                        <span class="badge-count">${count}</span>
                    </span>
                `).join('')}
            </div>
        `;
        
        container.appendChild(yearDiv);
    });
});