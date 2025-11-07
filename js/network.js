document.addEventListener('DOMContentLoaded', () => {
  const articles = getArticles();

  // ---------- Pré-processamento de autores ----------
  function normalizeAuthorName(name) {
    if (!name) return '';
    // remove acentos
    let n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // separadores e símbolos comuns
    n = n.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    // "Silva, J." -> "J Silva"
    if (n.includes(',')) {
      const [last, first] = n.split(',').map(s => s.trim());
      n = `${first} ${last}`.trim();
    }
    // capitalização simples
    n = n.split(' ')
      .filter(Boolean)
      .map(w => w.length === 1 ? (w.toUpperCase() + '.') : (w[0].toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ');
    return n.replace(/\s+/g, ' ').trim();
  }

  function splitAuthors(raw) {
    if (!raw) return [];
    // respeita o parse original (vírgula/;), mas também divide por " and " e " & "
    return raw.split(/[,;]| and | & /i).map(s => s.trim()).filter(Boolean);
  }

  // ---------- Construção da rede (com normalização sem mudar common.js) ----------
  const authorCounts = new Map();
  const collaborations = new Map();

  articles.forEach(article => {
    // usa parseAuthors se existir; senão, usa nossa divisão
    const baseAuthors = typeof parseAuthors === 'function'
      ? parseAuthors(article.authors)
      : splitAuthors(article.authors);

    const authors = baseAuthors.map(normalizeAuthorName).filter(Boolean);

    authors.forEach(a => authorCounts.set(a, (authorCounts.get(a) || 0) + 1));
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const pair = [authors[i], authors[j]].sort().join('|');
        collaborations.set(pair, (collaborations.get(pair) || 0) + 1);
      }
    }
  });

  const nodes = [...authorCounts.entries()].map(([name, count]) => ({
    id: name,
    count,
    radius: Math.sqrt(count) * 5 + 5
  }));

  const links = [...collaborations.entries()].map(([pair, strength]) => {
    const [source, target] = pair.split('|');
    return { source, target, strength };
  });

  // ---------- Dimensões do container ----------
  const vizEl = document.getElementById('networkViz');
  // fallback de altura se o CSS não foi aplicado
  if (!vizEl.style.height || vizEl.clientHeight === 0) {
    vizEl.style.height = '80vh';
  }
  const width = vizEl.clientWidth || window.innerWidth;
  const height = vizEl.clientHeight || Math.round(window.innerHeight * 0.8);

  // ---------- SVG + Zoom/Pan ----------
  const svg = d3.select('#networkViz')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%');

  const g = svg.append('g');

  const zoom = d3.zoom()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // ---------- Force Simulation (definida ANTES do drag usar 'simulation') ----------
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.radius + 5));

  // ---------- Elementos ----------
  const link = g.append('g')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', d => Math.sqrt(d.strength));

  const node = g.append('g')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', d => d.radius)
    .attr('fill', '#1e40af')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .call(drag(simulation)); // <- agora simulation já existe

  const label = g.append('g')
    .selectAll('text')
    .data(nodes)
    .join('text')
    .text(d => d.id)
    .attr('font-size', 10)
    .attr('dx', d => d.radius + 5)
    .attr('dy', 4);

  node.append('title')
    .text(d => `${d.id}\n${d.count} publicaç${d.count !== 1 ? 'ões' : 'ão'}`);

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });

  // Ajuste para caber na tela após estabilizar um pouco
  setTimeout(() => fitToView(), 800);
  simulation.alpha(1).restart();

  function fitToView(padding = 40) {
    const bbox = g.node().getBBox();
    const scale = Math.min(
      (width - padding) / Math.max(bbox.width, 1),
      (height - padding) / Math.max(bbox.height, 1)
    );
    const translateX = (width - scale * (bbox.x + bbox.width / 2)) / 2;
    const translateY = (height - scale * (bbox.y + bbox.height / 2)) / 2;
    svg.transition().duration(600).call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );
  }

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
  }

  // ---------- Top listas com "Ver mais" ----------
  function renderTop(listElem, data, isCollab) {
    let limit = 10;
    function update() {
      listElem.innerHTML = data.slice(0, limit)
        .map(([key, count]) => {
          const label = isCollab ? key.replace('|', ' & ') : key;
          return `<li><span>${label}</span><strong>${count}</strong></li>`;
        }).join('');
    }
    update();
    return () => {
      limit += 10;
      update();
    };
  }

  const topAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCollabs = [...collaborations.entries()].sort((a, b) => b[1] - a[1]);

  const moreAuthors = renderTop(document.getElementById('topAuthors'), topAuthors, false);
  const moreCollabs = renderTop(document.getElementById('topCollabs'), topCollabs, true);

  const btnMoreAuthors = document.getElementById('moreAuthors');
  const btnMoreCollabs = document.getElementById('moreCollabs');
  if (btnMoreAuthors) btnMoreAuthors.addEventListener('click', moreAuthors);
  if (btnMoreCollabs) btnMoreCollabs.addEventListener('click', moreCollabs);
});
