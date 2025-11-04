document.addEventListener('DOMContentLoaded', () => {
    const articles = getArticles();
    
    // Calculate statistics
    const totalArticles = articles.length;
    
    const authorsSet = new Set();
    articles.forEach(article => {
        parseAuthors(article.authors).forEach(author => authorsSet.add(author));
    });
    const totalAuthors = authorsSet.size;
    
    const years = articles.map(a => parseInt(a.year)).filter(y => !isNaN(y));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearRange = `${minYear}-${maxYear}`;
    
    const keywordMap = extractAllKeywords(articles);
    const topKeyword = [...keywordMap.entries()]
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    
    // Update stats
    document.getElementById('totalArticles').textContent = totalArticles;
    document.getElementById('totalAuthors').textContent = totalAuthors;
    document.getElementById('yearRange').textContent = yearRange;
    document.getElementById('topKeyword').textContent = topKeyword;
    
    // Publications by year chart
    const yearCounts = {};
    articles.forEach(article => {
        const year = article.year;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    
    const yearLabels = Object.keys(yearCounts).sort();
    const yearData = yearLabels.map(year => yearCounts[year]);
    
    new Chart(document.getElementById('yearChart'), {
        type: 'bar',
        data: {
            labels: yearLabels,
            datasets: [{
                label: 'Publicações',
                data: yearData,
                backgroundColor: '#1e40af'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Top keywords chart
    const topKeywords = [...keywordMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    new Chart(document.getElementById('keywordChart'), {
        type: 'bar',
        data: {
            labels: topKeywords.map(k => k[0]),
            datasets: [{
                label: 'Ocorrências',
                data: topKeywords.map(k => k[1]),
                backgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Top authors chart
    const authorCounts = new Map();
    articles.forEach(article => {
        parseAuthors(article.authors).forEach(author => {
            authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
        });
    });
    
    const topAuthors = [...authorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    new Chart(document.getElementById('authorChart'), {
        type: 'bar',
        data: {
            labels: topAuthors.map(a => a[0]),
            datasets: [{
                label: 'Publicações',
                data: topAuthors.map(a => a[1]),
                backgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            }
        }
    });
});