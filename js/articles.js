let articles = getArticles();
let filteredArticles = [...articles];
let sortColumn = null;
let sortDirection = 'asc';

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = filteredArticles.map(article => `
        <tr>
            <td>${article.title}</td>
            <td>${article.authors}</td>
            <td>${article.year}</td>
            <td>${article.keywords}</td>
        </tr>
    `).join('');
    
    document.getElementById('resultCount').textContent = 
        `${filteredArticles.length} artigo${filteredArticles.length !== 1 ? 's' : ''} encontrado${filteredArticles.length !== 1 ? 's' : ''}`;
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredArticles.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (column === 'year') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        } else {
            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    updateSortIcons();
    renderTable();
}

function updateSortIcons() {
    document.querySelectorAll('th .sort-icon').forEach(icon => {
        icon.textContent = '↕';
    });
    
    if (sortColumn) {
        const th = document.querySelector(`th[data-sort="${sortColumn}"]`);
        if (th) {
            const icon = th.querySelector('.sort-icon');
            icon.textContent = sortDirection === 'asc' ? '↑' : '↓';
        }
    }
}

function filterTable(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    if (!term) {
        filteredArticles = [...articles];
    } else {
        filteredArticles = articles.filter(article => {
            return Object.values(article).some(value => 
                String(value).toLowerCase().includes(term)
            );
        });
    }
    
    renderTable();
}

document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            sortTable(th.dataset.sort);
        });
    });
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterTable(e.target.value);
    });
});