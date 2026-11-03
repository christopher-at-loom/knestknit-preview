import {CART_KEY,variantIndex,sanitizeCart,changeCart,filterProducts} from './core.js';
const base=document.body.dataset.base;
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
const url=(src,width=600)=>{const u=new URL(src);u.searchParams.set('width',width);return u.href;};
const path=p=>`${base}products/${p.handle}/`;
const announce=text=>{document.querySelector('#store-status').textContent=text;};
const imageHTML=(src,alt)=>`<img src="${e(url(src))}" alt="${e(alt)}" width="600" height="600" loading="lazy">`;
const data=await fetch(`${base}assets/catalog.json`).then(r=>{if(!r.ok)throw new Error('Catalog failed to load');return r.json();});
const {products,locale}=data,index=variantIndex(products);
let lines=[];
try{lines=sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY)),index);}catch{}
function save(){try{localStorage.setItem(CART_KEY,JSON.stringify(lines));}catch{}}
const drawer=document.querySelector('#cart-drawer');
let returnFocus;
function openDialog(dialog){
  if(dialog.open)return;
  returnFocus=document.activeElement;
  dialog.showModal();
  dialog.addEventListener('close',()=>{returnFocus?.focus();},{once:true});
}
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>{
 d.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=[...d.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(!first){event.preventDefault();return;}
  if(event.shiftKey && (document.activeElement===first||!d.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey && (document.activeElement===last||!d.contains(document.activeElement))){event.preventDefault();first.focus();}
 });
 d.addEventListener('click',event=>{
  if(event.target!==d)return;
  const b=d.getBoundingClientRect();
  if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)d.close();
 });
});
document.querySelector('[data-open-menu]').addEventListener('click',()=>openDialog(document.querySelector('#mobile-menu')));
document.querySelector('[data-open-cart]').addEventListener('click',()=>openDialog(drawer));
function cartMarkup(full){
  if(!lines.length)return `<div class="empty-state"><h3>Your bag is empty.</h3><p>Choose a pair to get started.</p><a class="button" href="${base}collections/all/">Shop socks ↗</a></div>`;
  const subtotal=lines.reduce((n,l)=>n+l.quantity*index.get(l.variantId).variant.price,0);
  return `<div class="cart-lines">${lines.map(l=>{
    const {product:p,variant:v}=index.get(l.variantId);
    const prefix=full?'page':'drawer';
    return `<article class="cart-line">${imageHTML(v.image||p.image,p.title)}<div><h3 class="cart-line-title"><a href="${path(p)}?variant=${v.id}">${e(p.title)}</a></h3>${v.title==='Default Title'?'':`<p class="cart-line-option">${e(v.title)}</p>`}<p class="cart-line-option">${money(v.price)} each</p><div class="cart-line-bottom"><div class="cart-quantity"><button data-adjust="${v.id}" data-delta="-1" data-focus-key="${prefix}-${v.id}-minus" aria-label="Decrease quantity for ${e(p.title)}">−</button><input type="number" min="1" step="1" value="${l.quantity}" data-cart-quantity="${v.id}" data-focus-key="${prefix}-${v.id}-quantity" aria-label="Quantity for ${e(p.title)}"><button data-adjust="${v.id}" data-delta="1" data-focus-key="${prefix}-${v.id}-plus" aria-label="Increase quantity for ${e(p.title)}">+</button></div><span>${money(v.price*l.quantity)}</span></div><button class="cart-remove" data-remove="${v.id}" aria-label="Remove ${e(p.title)}">Remove</button></div></article>`;
  }).join('')}</div><div class="cart-summary"><p class="subtotal"><span>Subtotal</span><span>${money(subtotal)}</span></p><p class="final-sale">${e(locale.finalSale)} <a href="${base}policies/refund-policy/">Read returns</a></p><p class="form-error" data-cart-error role="alert"></p><div class="button-row">${full?'':`<a class="button" href="${base}cart/">View bag →</a>`}<a class="text-link" href="${base}collections/all/">Continue shopping ↗</a></div></div>`;
}
function renderCart(){
  const focusKey=document.activeElement?.dataset.focusKey;
  document.querySelectorAll('[data-cart-content]').forEach(el=>el.innerHTML=cartMarkup(false));
  document.querySelectorAll('[data-cart-page]').forEach(el=>el.innerHTML=cartMarkup(true));
  const count=lines.reduce((n,l)=>n+l.quantity,0);
  document.querySelectorAll('.cart-count').forEach(el=>el.textContent=count);
  if(focusKey)document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
}
function mutate(id,q,options={}){
  lines=changeCart(lines,id,q,index,options);save();renderCart();
  const count=lines.reduce((n,l)=>n+l.quantity,0);
  announce(`${count} ${count===1?'item':'items'} in your bag.`);
}
function showCartError(error){
  document.querySelectorAll('[data-cart-error]').forEach(el=>el.textContent=error.message);announce(error.message);
}
document.addEventListener('click',event=>{
  const quick=event.target.closest('[data-quick-add]');
  const adjust=event.target.closest('[data-adjust]');
  const remove=event.target.closest('[data-remove]');
  try{
    if(quick){mutate(quick.dataset.quickAdd,1,{add:true});openDialog(drawer);}
    if(adjust){const id=adjust.dataset.adjust,q=lines.find(l=>l.variantId===id)?.quantity,container=adjust.closest('dialog')||adjust.closest('[data-cart-page]');if(q){const next=q+Number(adjust.dataset.delta);mutate(id,next,{remove:next===0});if(next===0)container?.querySelector('button,a')?.focus();}}
    if(remove){const container=remove.closest('[data-cart-content], [data-cart-page]');mutate(remove.dataset.remove,0,{remove:true});container?.querySelector('button,a')?.focus();}
  }catch(error){showCartError(error);}
});
document.addEventListener('change',event=>{
  const input=event.target.closest('[data-cart-quantity]');if(!input)return;
  try{mutate(input.dataset.cartQuantity,Number(input.value));}catch(error){input.value=lines.find(l=>l.variantId===input.dataset.cartQuantity)?.quantity||1;showCartError(error);}
});
window.addEventListener('storage',event=>{if(event.key===CART_KEY){try{lines=sanitizeCart(JSON.parse(event.newValue),index);}catch{lines=[];}renderCart();}});
renderCart();

// Product selection and gallery: native variant IDs remain stable throughout.
const productRoot=document.querySelector('[data-product]');
if(productRoot){
  const p=products.find(p=>p.id===productRoot.dataset.product),form=productRoot.querySelector('[data-product-form]'),select=form.elements.variant;
  const main=productRoot.querySelector('.product-main-image'),zoom=document.querySelector('#image-dialog');
  function setImage(src,alt){
    main.src=url(src,1100);main.srcset=[360,600,900,1200].map(w=>`${url(src,w)} ${w}w`).join(', ');main.alt=alt;
    zoom.querySelector('img').src=url(src,1600);zoom.querySelector('img').alt=alt;
    productRoot.querySelectorAll('[data-gallery-image]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.galleryImage===src));
  }
  function selection(push=false){
    const v=p.variants.find(v=>v.id===select.value);
    productRoot.querySelector('[data-product-price]').innerHTML=`${money(v.price)} ${v.compare_at_price>v.price?`<s>${money(v.compare_at_price)}</s>`:''}`;
    form.querySelector('.add-button').disabled=!v.available;form.querySelector('.add-button').textContent=v.available?locale.addToCart:locale.soldOut;
    productRoot.querySelector('[data-variant-material]').textContent=v.material||'';
    setImage(v.image||p.image,v.image?`${p.title} — ${v.title}`:p.title);
    form.querySelector('[data-product-error]').textContent='';
    if(push){const u=new URL(location.href);u.searchParams.set('variant',v.id);history.pushState({},'',u);}
  }
  function fromURL(){const id=new URL(location.href).searchParams.get('variant');select.value=p.variants.find(v=>v.id===id)?.id || p.variants.find(v=>v.available)?.id || p.variants[0].id;selection();}
  fromURL();select.addEventListener('change',()=>selection(true));window.addEventListener('popstate',fromURL);
  form.addEventListener('submit',event=>{event.preventDefault();try{mutate(select.value,Number(form.elements.quantity.value),{add:true});openDialog(drawer);}catch(error){form.querySelector('[data-product-error]').textContent=error.message;}});
  productRoot.querySelectorAll('[data-gallery-image]').forEach(b=>b.addEventListener('click',()=>setImage(b.dataset.galleryImage,b.dataset.galleryAlt)));
  productRoot.querySelector('[data-zoom]').addEventListener('click',()=>openDialog(zoom));
}

function productCard(p){
  const v=p.variants.find(v=>v.available)||p.variants[0],prices=p.variants.filter(v=>v.available).map(v=>v.price),minimum=prices.length?Math.min(...prices):v.price,maximum=prices.length?Math.max(...prices):v.price;
  const sale=v.compare_at_price>v.price;
  return `<article class="product-card" data-product-card="${p.id}"><a class="card-image" href="${path(p)}" aria-label="${e(p.title)}">${imageHTML(v.image||p.image,p.title)}${!p.available?'<span class="badge">Sold out</span>':sale?'<span class="badge sale">Sale</span>':''}</a><div class="card-copy"><p class="eyebrow">${e(p.code)}</p><h3><a href="${path(p)}">${e(p.title)}</a></h3><p class="card-note">${e([p.height,p.cushion&&(p.cushion==='None'?'Flat knit':`${p.cushion} cushion`),p.pack&&`${p.pack} ${p.pack===1?'pair':'pairs'}`].filter(Boolean).join(' · '))}</p><p class="card-price">${maximum!==minimum?'From ':''}${money(minimum)} ${sale&&minimum===v.price?`<s>${money(v.compare_at_price)}</s>`:''}</p>${p.variants.length===1?`<button class="button button-outline card-action" data-quick-add="${v.id}" ${!v.available?'disabled':''}>${v.available?'Add to cart':'Sold out'}<span aria-hidden="true"> +</span></button>`:`<a class="card-action text-link" href="${path(p)}">Choose options ↗</a>`}</div></article>`;
}
const catalog=document.querySelector('[data-catalog]');
if(catalog){
  const group=catalog.dataset.collection,isSearch=catalog.dataset.search==='true',filterForm=catalog.querySelector('[data-filter-form]');
  const subset=products.filter(p=>group==='all'||group==='thin-flat-knit'&&p.group==='flat-knit'||group==='cushioned'&&p.group==='cushioned'||group==='packs-makers-choice'&&(p.pack||p.group==='packs'));
  const searchForm=catalog.querySelector('.search-form'),searchInput=searchForm?.elements.q,suggestions=catalog.querySelector('#search-suggestions');
  const keys=['height','cushion','availability','max_price','sort'];
  function render(){
    const params=new URLSearchParams(location.search);
    if(!isSearch)params.delete('q');
    for(const key of keys)filterForm.elements[key].value=params.get(key)||(key==='sort'?'featured':'');
    if(searchInput)searchInput.value=params.get('q')||'';
    const result=filterProducts(subset,params);
    catalog.querySelector('[data-results]').innerHTML=result.map(productCard).join('');
    catalog.querySelector('[data-results-count]').textContent=`${result.length} ${result.length===1?'product':'products'}${params.get('q')?` for “${params.get('q')}”`:''}`;
    catalog.querySelector('[data-empty]').hidden=result.length>0;
    const labels={q:'Search',height:'Height',cushion:'Cushion',availability:'Availability',max_price:'Up to $'};
    catalog.querySelector('[data-filter-chips]').innerHTML=[...params].filter(([k,v])=>labels[k]&&v).map(([k,v])=>`<button class="filter-chip" data-clear-filter="${k}" aria-label="Remove ${e(labels[k])} filter">${e(labels[k])}${k==='max_price'?'':': '}${e(v)} ×</button>`).join('');
  }
  function update(params){const u=new URL(location.href);u.search=params.toString();history.pushState({},'',u);render();}
  filterForm.addEventListener('submit',event=>event.preventDefault());
  filterForm.addEventListener('change',()=>{const params=new URLSearchParams(location.search);for(const key of keys){const value=filterForm.elements[key].value;if(value&&value!=='featured')params.set(key,value);else params.delete(key);}update(params);});
  catalog.addEventListener('click',event=>{const chip=event.target.closest('[data-clear-filter]');if(chip){const params=new URLSearchParams(location.search);params.delete(chip.dataset.clearFilter);update(params);}if(event.target.closest('[data-clear-filters]'))update(new URLSearchParams());});
  if(searchForm){
    searchForm.addEventListener('submit',event=>{event.preventDefault();const params=new URLSearchParams(location.search),q=searchInput.value.trim();q?params.set('q',q):params.delete('q');suggestions.hidden=true;searchInput.setAttribute('aria-expanded','false');update(params);});
    searchInput.addEventListener('input',()=>{const q=searchInput.value.trim();const matches=q?filterProducts(products,new URLSearchParams({q})).slice(0,5):[];suggestions.innerHTML=matches.map(p=>`<a href="${path(p)}">${e(p.title)} ↗</a>`).join('');suggestions.hidden=!matches.length;searchInput.setAttribute('aria-expanded',String(!!matches.length));});
    searchInput.addEventListener('keydown',event=>{if(event.key==='Escape'){suggestions.hidden=true;searchInput.setAttribute('aria-expanded','false');}});
    searchForm.addEventListener('focusout',event=>{if(!searchForm.contains(event.relatedTarget)){suggestions.hidden=true;searchInput.setAttribute('aria-expanded','false');}});
  }
  window.addEventListener('popstate',render);render();
}
