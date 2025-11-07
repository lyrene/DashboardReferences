document.addEventListener('DOMContentLoaded', () => {
  const articles = getArticles(); // common.js
  // parseKeywords: separa por ; , e lowercase (já pronto)

  // -------- helpers --------
  const by = k => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0);
  const byDesc = k => (a, b) => (a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : 0);

  const escapeRx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // destaca "term" (case-insensitive) no texto
  function highlight(text, term) {
    if (!text) return '';
    if (!term) return text;
    const rx = new RegExp(`(${escapeRx(term)})`, 'gi');
    return text.replace(rx, '<mark class="hl">$1</mark>');
  }

  // verifica presença de termo no texto (aproximação com substring case-insensitive)
  function hasTerm(text, term) {
    if (!text || !term) return false;
    return text.toLowerCase().includes(term.toLowerCase());
  }

  // palavras-chave de um artigo (array, já minúsculas via parseKeywords)
  function kwList(article) {
    return parseKeywords(article.keywords || '');
  }

  // -------- construir dicionário a partir de keywords --------
  const allTermsSet = new Set();
  const kwsPerArticle = []; // para métricas: qtde de keywords/ artigo

  articles.forEach(a => {
    const kws = kwList(a);
    kwsPerArticle.push(kws.length);
    kws.forEach(t => allTermsSet.add(t)); // conjunto de termos (n tokens) a partir de keywords
  });

  const allTerms = Array.from(allTermsSet); // array de termos únicos
  // para cada termo, computar em quantos ARTIGOS ele aparece no título/keywords/abstract
  const dictRows = allTerms.map(term => {
    let tCount = 0, kCount = 0, aCount = 0;
    articles.forEach(art => {
      const inTitle = hasTerm(art.title || '', term);
      const inKeywords = kwList(art).includes(term); // match exato com token de keywords
      const inAbstract = hasTerm(art.abstract || '', term);
      if (inTitle) tCount++;
      if (inKeywords) kCount++;
      if (inAbstract) aCount++;
    });
    return {
      term,
      inTitle: tCount,
      inKeywords: kCount,
      inAbstract: aCount,
      included: [] // será preenchido depois
    };
  });

  // coluna "Incluído em": outros termos que CONTÊM o termo (supertermos)
  // Atenção: O(n^2). Para bases grandes, otimizar com índice de prefixo/sufixo.
  const termIndex = new Map(dictRows.map((r, i) => [r.term, i]));
  dictRows.forEach(r => {
    const base = r.term.toLowerCase();
    const included = [];
    allTerms.forEach(other => {
      if (other !== r.term && other.toLowerCase().includes(base)) {
        const idx = termIndex.get(other);
        const row = dictRows[idx];
        included.push({
          term: other,
          inTitle: row.inTitle,
          inKeywords: row.inKeywords,
          inAbstract: row.inAbstract
        });
      }
    });
    // ordena supertermos por frequência total desc
    r.included = included.sort((a, b) =>
      (b.inTitle + b.inKeywords + b.inAbstract) - (a.inTitle + a.inKeywords + a.inAbstract)
    );
    r.includedCount = r.included.length;
  });

  // -------- métricas do Quadro 1 --------
  const uniqueTerms = allTerms.length;
  const avgTermsPerArticle = kwsPerArticle.length
    ? (kwsPerArticle.reduce((s, n) => s + n, 0) / kwsPerArticle.length)
    : 0;
  const maxTermsPerArticle = kwsPerArticle.length ? Math.max(...kwsPerArticle) : 0;

  // -------- render Quadro 1 --------
  const dictMetricsEl = document.getElementById('dictMetrics');
  const dictTBody = document.querySelector('#dictTable tbody');
  const dictTHead = document.querySelectorAll('#dictTable thead th');

  dictMetricsEl.innerHTML = `
    <span class="badge"># termos únicos: <strong>${uniqueTerms}</strong></span>
    <span class="badge">média termos/artigo: <strong>${avgTermsPerArticle.toFixed(2)}</strong></span>
    <span class="badge">máximo termos/artigo: <strong>${maxTermsPerArticle}</strong></span>
  `;

  // ordenação padrão: por (inKeywords + inTitle + inAbstract) desc
  function totalFreq(row) { return row.inTitle + row.inKeywords + row.inAbstract; }
  let dictData = [...dictRows].sort((a, b) => totalFreq(b) - totalFreq(a));

  function renderDictTable(rows) {
    dictTBody.innerHTML = rows.map(r => {
      const includedHtml = r.included.length
        ? `<div class="included-list">${
            r.included.map(x =>
              `<a class="pill term-link" data-term="${x.term}" title="Ir para ${x.term}">
                 ${x.term} <span class="muted">(${x.inTitle}/${x.inKeywords}/${x.inAbstract})</span>
               </a>`
            ).join('')
          }</div>`
        : '<span class="muted">—</span>';

    return `
      <tr>
        <td><a class="term-link" data-term="${r.term}">${r.term}</a></td>
        <td class="nowrap">${r.inTitle}</td>
        <td class="nowrap">${r.inKeywords}</td>
        <td class="nowrap">${r.inAbstract}</td>
        <td>${includedHtml}</td>
      </tr>`;
    }).join('');
  }

  renderDictTable(dictData);

  // clique em termo (coluna 1) ou nos “incluídos em”
  function delegateDictClicks(e) {
    const a = e.target.closest('a.term-link');
    if (!a) return;
    const term = a.getAttribute('data-term');
    focusTerm(term);
  }
  dictTBody.addEventListener('click', delegateDictClicks);

  // ordenação clicando no header
  let sortState = { key: 'total', dir: 'desc' };
  dictTHead.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (key === 'term') {
        // sort alfabético
        dictData.sort((a, b) => a.term.localeCompare(b.term, 'pt'));
      } else if (key === 'inTitle' || key === 'inKeywords' || key === 'inAbstract' || key === 'includedCount') {
        const dir = (sortState.key === key && sortState.dir === 'desc') ? 'asc' : 'desc';
        dictData.sort((a, b) => dir === 'asc' ? a[key] - b[key] : b[key] - a[key]);
        sortState = { key, dir };
      } else {
        // total (fallback)
        dictData.sort((a, b) => totalFreq(b) - totalFreq(a));
        sortState = { key: 'total', dir: 'desc' };
      }
      renderDictTable(dictData);
    });
  });

  // -------- Quadro 2: artigos do termo --------
  const docsMetricsEl = document.getElementById('docsMetrics');
  const docsTBody = document.querySelector('#docsTable tbody');
  const docsTHead = document.querySelectorAll('#docsTable thead th');

  let docsData = [];
  let currentTerm = '';

  function buildDocsForTerm(term) {
    currentTerm = term;
    const rows = [];
    let cTitle = 0, cKw = 0, cAbs = 0, cMulti = 0;

    articles.forEach(a => {
      const inT = hasTerm(a.title || '', term);
      const inK = kwList(a).includes(term);
      const inA = hasTerm(a.abstract || '', term);
      if (inT || inK || inA) {
        const fieldsHit = (inT?1:0) + (inK?1:0) + (inA?1:0);
        if (inT) cTitle++;
        if (inK) cKw++;
        if (inA) cAbs++;
        if (fieldsHit >= 2) cMulti++;

        rows.push({
          year: parseInt(a.year) || null,
          title: a.title || '',
          keywords: a.keywords || '',
          abstract: a.abstract || '',
          authors: a.authors || '',
          _flags: { inT, inK, inA }
        });
      }
    });

    // ordenar por ano desc (nulls no final)
    rows.sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return b.year - a.year;
    });

    // métricas do quadro 2
    const total = rows.length;
    docsMetricsEl.innerHTML = `
      <span class="badge">termo: <strong>${term}</strong></span>
      <span class="badge">em Título: <strong>${cTitle}</strong></span>
      <span class="badge">em Keywords: <strong>${cKw}</strong></span>
      <span class="badge">em Abstract: <strong>${cAbs}</strong></span>
      <span class="badge">em >1 campo: <strong>${cMulti}</strong></span>
      <span class="badge"># artigos: <strong>${total}</strong></span>
    `;

    // render
    docsData = rows;
    renderDocsTable(rows, term);
  }

  function renderDocsTable(rows, term) {
    if (!rows.length) {
      docsTBody.innerHTML = `<tr><td colspan="5" class="muted">Nenhum artigo encontrado para “${term}”.</td></tr>`;
      return;
    }
    docsTBody.innerHTML = rows.map(r => {
      return `
        <tr>
          <td class="nowrap">${r.year ?? ''}</td>
          <td>${highlight(r.title, term)}</td>
          <td>${highlight(r.keywords, term)}</td>
          <td>${highlight(r.abstract, term)}</td>
          <td>${r.authors}</td>
        </tr>
      `;
    }).join('');
  }

  function focusTerm(term) {
    // seleciona o termo no quadro 2
    buildDocsForTerm(term);
    // rola para ele no quadro 1 (se existir linha)
    const anchor = document.querySelector(`#dictTable tbody a.term-link[data-term="${CSS.escape(term)}"]`);
    if (anchor) {
      anchor.scrollIntoView({ block: 'nearest' });
    }
  }

  // ordenação no quadro 2 por clique no header
  let docsSort = { key: 'year', dir: 'desc' };
  docsTHead.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (!key || docsData.length === 0) return;

      const dir = (docsSort.key === key && docsSort.dir === 'desc') ? 'asc' : 'desc';
      docsSort = { key, dir };

      docsData.sort((a, b) => {
        const va = a[key] ?? '';
        const vb = b[key] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') {
          return dir === 'asc' ? va - vb : vb - va;
        }
        return dir === 'asc'
          ? String(va).localeCompare(String(vb), 'pt')
          : String(vb).localeCompare(String(va), 'pt');
      });

      renderDocsTable(docsData, currentTerm);
    });
  });

  // interação inicial: nada no quadro 2 até escolher um termo
});
