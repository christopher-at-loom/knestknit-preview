export const CART_KEY='knestknit-mockup-cart-v1';
export function variantIndex(products){return new Map(products.flatMap(p=>p.variants.map(v=>[String(v.id),{product:p,variant:v}])));}
export function validQuantity(q,price=0){return Number.isSafeInteger(q)&&q>0&&Number.isSafeInteger(q*price);}
export function sanitizeCart(raw,index){
  if(!Array.isArray(raw))return [];
  const items=new Map();
  for(const line of raw){
    if(!line || typeof line!=='object')continue;
    const id=String(line.variantId),v=index.get(id)?.variant;
    if(!v?.available || !validQuantity(line.quantity,v.price))continue;
    const q=(items.get(id)||0)+line.quantity;
    if(validQuantity(q,v.price))items.set(id,q);
  }
  const result=[...items].map(([variantId,quantity])=>({variantId,quantity}));
  return Number.isSafeInteger(result.reduce((n,l)=>n+l.quantity*index.get(l.variantId).variant.price,0))?result:[];
}
export function changeCart(lines,id,quantity,index,{add=false,remove=false}={}){
  id=String(id);const v=index.get(id)?.variant;
  if(!v?.available)throw new Error('This option is unavailable. Choose another.');
  if(remove)return lines.filter(l=>l.variantId!==id);
  if(!validQuantity(quantity,v.price))throw new Error('Enter a whole-number quantity of 1 or more.');
  const next=lines.map(l=>({...l})),existing=next.find(l=>l.variantId===id);
  const total=quantity+(add?(existing?.quantity||0):0);
  if(!validQuantity(total,v.price))throw new Error('Choose a smaller quantity.');
  if(existing)existing.quantity=total;else next.push({variantId:id,quantity:total});
  if(!Number.isSafeInteger(next.reduce((n,l)=>n+l.quantity*index.get(l.variantId).variant.price,0)))throw new Error('Choose a smaller quantity.');
  return next;
}
export const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterProducts(products,params){
  const words=normalize(params.get('q')).trim().split(/\s+/).filter(Boolean);
  let result=products.filter(p=>{
    const text=normalize([p.title,p.code,p.description,...p.variants.map(v=>v.title)].join(' '));
    if(!words.every(w=>text.includes(w)))return false;
    if(params.get('height')&&p.height!==params.get('height'))return false;
    if(params.get('cushion')&&p.cushion!==params.get('cushion'))return false;
    if(params.get('availability')==='available'&&!p.available)return false;
    if(params.get('availability')==='unavailable'&&p.available)return false;
    const cap=params.get('max_price');
    if(cap!==null&&cap!==''&&Number.isFinite(Number(cap))&&Number(cap)>=0){
      if(!p.variants.some(v=>v.available&&v.price<=Math.round(Number(cap)*100)))return false;
    }
    return true;
  });
  const price=p=>Math.min(...(p.variants.some(v=>v.available)?p.variants.filter(v=>v.available):p.variants).map(v=>v.price));
  if(params.get('sort')==='price-asc')result.sort((a,b)=>price(a)-price(b));
  if(params.get('sort')==='price-desc')result.sort((a,b)=>price(b)-price(a));
  if(params.get('sort')==='title')result.sort((a,b)=>a.title.localeCompare(b.title));
  return result;
}
