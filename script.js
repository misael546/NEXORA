const toggle=document.getElementById('menuToggle');const nav=document.getElementById('mainNav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');toggle.textContent=open?'×':'☰';});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú');toggle.textContent='☰';}));}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
const searchForm=document.getElementById('searchForm');if(searchForm){const input=document.getElementById('siteSearch');const cards=[...document.querySelectorAll('#articleGrid .article-card')];const status=document.getElementById('searchStatus');const empty=document.getElementById('emptySearch');const run=()=>{const q=input.value.trim().toLocaleLowerCase('es');let count=0;cards.forEach(card=>{const hay=(card.innerText+' '+(card.dataset.search||'')).toLocaleLowerCase('es');const match=!q||hay.includes(q);card.hidden=!match;if(match)count++;});empty.hidden=count!==0;status.textContent=q?(count+' artículo(s) encontrado(s)'):'Mostrando todos los artículos';};searchForm.addEventListener('submit',e=>{e.preventDefault();run();});input.addEventListener('input',run);}

async function loadPublishedArticles(){
  const grid=document.getElementById("articleGrid");if(!grid)return;
  try{
    const response=await fetch("/api/articles");if(!response.ok)return;
    const data=await response.json();
    (data.articles||[]).forEach(article=>{
      if(grid.querySelector('[data-slug="'+CSS.escape(article.slug)+'"]'))return;
      const card=document.createElement("article");card.className="article-card";card.dataset.slug=article.slug;card.dataset.search=[article.title,article.category,article.excerpt].join(" ").toLocaleLowerCase("es");
      const link=document.createElement("a");link.href="leer.html?slug="+encodeURIComponent(article.slug);
      const visual=document.createElement("div");visual.className="article-visual "+(article.category==="NEXORA AI"?"visual-ai":article.category==="NEXORA GAMING"?"visual-game":"visual-tech");
      const symbol=document.createElement("span");symbol.className=article.category==="NEXORA AI"?"visual-orb":article.category==="NEXORA GAMING"?"pixel-shape":"tech-symbol";symbol.textContent=article.category==="NEXORA AI"?"✳":article.category==="NEXORA GAMING"?"▦":"⌘";
      const label=document.createElement("span");label.className="visual-label";label.textContent=article.category;visual.append(symbol,label);
      const info=document.createElement("div");info.className="article-info";
      const meta=document.createElement("div");meta.className="article-meta";const cat=document.createElement("span");cat.textContent=article.category;const type=document.createElement("span");type.textContent="ARTÍCULO";meta.append(cat,type);
      const h=document.createElement("h3");h.textContent=article.title;const p=document.createElement("p");p.textContent=article.excerpt||"Nueva publicación de NEXORA.";const read=document.createElement("span");read.className="read-more";read.textContent="LEER ARTÍCULO ↗";
      info.append(meta,h,p,read);link.append(visual,info);card.append(link);grid.prepend(card);
    });
    const input=document.getElementById("siteSearch");if(input)input.dispatchEvent(new Event("input"));
  }catch(error){console.warn("No se pudieron cargar artículos publicados.",error)}
}
loadPublishedArticles();
