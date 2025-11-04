document.addEventListener('DOMContentLoaded', () => {
    const articles = getArticles();
    
    // Build network data
    const authorCounts = new Map();
    const collaborations = new Map();
    
    articles.forEach(article => {
        const authors = parseAuthors(article.authors);
        
        authors.forEach(author => {
            authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
        });
        
        for (let i = 0; i < authors.length; i++) {
            for (let j = i + 1; j < authors.length; j++) {
                const pair = [authors[i], authors[j]].sort().join('|');
                collaborations.set(pair, (collaborations.get(pair) || 0) + 1);
            }
        }
    });
    
    // Create nodes and links
    const nodes = [...authorCounts.entries()].map(([name, count]) => ({
        id: name,
        count: count,
        radius: Math.sqrt(count) * 5 + 5
    }));
    
    const links = [...collaborations.entries()].map(([pair, strength]) => {
        const [source, target] = pair.split('|');
        return { source, target, strength };
    });
    
    // D3 force simulation
    const width = document.getElementById('networkViz').clientWidth;
    const height = document.getElementById('networkViz').clientHeight;
    
    const svg = d3.select('#networkViz')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 5));
    
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', d => Math.sqrt(d.strength))
        .attr('stroke-opacity', 0.6);
    
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => d.radius)
        .attr('fill', '#1e40af')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .call(drag(simulation));
    
    const label = svg.append('g')
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
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    // Top authors list
    const topAuthors = [...authorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    document.getElementById('topAuthors').innerHTML = topAuthors
        .map(([author, count]) => `
            <li>
                <span>${author}</span>
                <strong>${count}</strong>
            </li>
        `).join('');
    
    // Top collaborations list
    const topCollabs = [...collaborations.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    document.getElementById('topCollabs').innerHTML = topCollabs
        .map(([pair, count]) => `
            <li>
                <span>${pair.replace('|', ' & ')}</span>
                <strong>${count}</strong>
            </li>
        `).join('');
});