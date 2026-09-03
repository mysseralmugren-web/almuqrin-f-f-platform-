const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const send=(r,s,b)=>{r.statusCode=s;Object.entries(H).forEach(([k,v])=>r.setHeader(k,v));r.end(JSON.stringify(b));};
const base=()=>String(process.env.DAFTRA_BASE_URL||'').replace(/\/$/,'');
async function get(path){const x=await fetch(base()+path,{headers:{accept:'application/json',APIKEY:process.env.DAFTRA_API_KEY}});let j=null;try{j=await x.json()}catch{};return {ok:x.ok,status:x.status,json:j};}
function rows(j){return Array.isArray(j?.data)?j.data:Array.isArray(j?.result?.data)?j.result.data:[]}
const slim=(arr)=>arr.map(x=>{const p=x.PurchaseOrder||x;return {id:p.id,no:p.no,date:p.date,draft:p.draft,supplier_id:p.supplier_id,supplier_business_name:p.supplier_business_name,summary_subtotal:p.summary_subtotal,summary_tax:p.summary_tax,summary_total:p.summary_total,total:p.total};});
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
 if(!base()||!process.env.DAFTRA_API_KEY)return send(res,503,{ok:false,error:'not_configured'});
 const [sup,tax,inv1,inv2,recent,drafts]=await Promise.all([
  get('/api2/suppliers.json?limit=100&page=1'),
  get('/api2/taxes.json?limit=100&page=1'),
  get('/api2/purchase_invoices.json?limit=20&page=1&keywords=3711'),
  get('/api2/purchase_invoices.json?limit=20&page=1&keywords=S00130711'),
  get('/api2/purchase_invoices.json?limit=50&page=1'),
  get('/api2/purchase_invoices.json?limit=50&page=1&draft=1')
 ]);
 const suppliers=rows(sup.json).map(x=>x.Supplier||x).filter(Boolean).map(x=>({id:x.id,business_name:x.business_name,notes:x.notes,bn1:x.bn1}));
 const taxes=rows(tax.json).map(x=>x.Tax||x).filter(Boolean).map(x=>({id:x.id,name:x.name,rate:x.rate,value:x.value,percentage:x.percentage}));
 const existing={tools_planet:slim(rows(inv1.json)),classic_palace:slim(rows(inv2.json))};
 return send(res,200,{ok:true,suppliers,taxes,existing,recent:slim(rows(recent.json)),drafts:slim(rows(drafts.json)),statuses:{suppliers:sup.status,taxes:tax.status,tools:inv1.status,classic:inv2.status,recent:recent.status,drafts:drafts.status}});
}
