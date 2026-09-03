const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const send=(r,s,b)=>{r.statusCode=s;Object.entries(H).forEach(([k,v])=>r.setHeader(k,v));r.end(JSON.stringify(b));};
const base=()=>String(process.env.DAFTRA_BASE_URL||'').replace(/\/$/,'');
const headers=()=>({accept:'application/json','content-type':'application/json',APIKEY:process.env.DAFTRA_API_KEY});
async function req(path,opts={}){const x=await fetch(base()+path,{...opts,headers:{...headers(),...(opts.headers||{})}});const t=await x.text();let j=null;try{j=t?JSON.parse(t):null}catch{};return {ok:x.ok,status:x.status,json:j,text:t};}
const rows=j=>Array.isArray(j?.data)?j.data:Array.isArray(j?.result?.data)?j.result.data:[];
async function findSupplierByVat(vat){const r=await req('/api2/suppliers.json?limit=100&page=1');return rows(r.json).map(x=>x.Supplier||x).find(x=>String(x.bn1||'').trim()===vat)||null;}
async function findInvoice(keyword){const r=await req('/api2/purchase_invoices.json?limit=50&page=1&keywords='+encodeURIComponent(keyword));return rows(r.json).map(x=>x.PurchaseOrder||x);}
function createdId(j){return j?.id ?? j?.data?.id ?? j?.PurchaseOrder?.id ?? j?.data?.PurchaseOrder?.id ?? null;}
function po(j){return j?.data?.PurchaseOrder||j?.PurchaseOrder||j?.data||j||{};}
async function createFinal(d,supplier){const body={PurchaseOrder:{supplier_id:Number(supplier.id),is_offline:true,supplier_business_name:d.supplier.name,currency_code:'SAR',date:d.date,no:d.no,draft:false},PurchaseOrderItem:[{item:d.item,description:d.description,unit_price:d.net,quantity:1,tax1:15}]};return req('/api2/purchase_invoices.json',{method:'POST',body:JSON.stringify(body)});}
export default async function handler(req0,res){
 if(req0.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
 if(!base()||!process.env.DAFTRA_API_KEY)return send(res,503,{ok:false,error:'not_configured'});
 const docs=[
  {key:'tools_planet_3711',supplier:{name:'شركة كوكب عددنا للتجارة',vat:'314636325500003'},no:'3711',date:'2026-07-29',net:155.65,tax:23.35,total:179.00,item:'مواد وأدوات تصنيع - Tools Planet',description:'فاتورة المورد 3711 بتاريخ 2026-07-29؛ صافي 155.65؛ ضريبة 23.35؛ إجمالي 179.00.'},
  {key:'classic_palace_S00130711',supplier:{name:'شركة قصر الكلاسيك للتجارة',vat:'311965935800003'},no:'S00130711',date:'2026-08-08',net:1587.01,tax:238.05,total:1825.06,item:'12 كرسي سفرة طعام',description:'فاتورة المورد S00130711 بتاريخ 2026-08-08؛ صافي بعد الخصم 1587.01؛ ضريبة 238.05؛ إجمالي 1825.06.'}
 ];
 const results=[];
 for(const d of docs){
  const existing=await findInvoice(d.no);
  if(existing.length){results.push({key:d.key,action:'skipped_existing',existing:existing.map(x=>({id:x.id,no:x.no,date:x.date,supplier_id:x.supplier_id,summary_subtotal:x.summary_subtotal,summary_total:x.summary_total}))});continue;}
  const supplier=await findSupplierByVat(d.supplier.vat);
  if(!supplier){results.push({key:d.key,action:'failed',stage:'supplier_not_found'});continue;}
  const c=await createFinal(d,supplier);
  if(!c.ok){results.push({key:d.key,action:'failed',stage:'create',status:c.status,response:c.json||c.text});continue;}
  const id=createdId(c.json);
  let detail=null;
  if(id){const g=await req(`/api2/purchase_invoices/${id}.json`);if(g.ok){const p=po(g.json);detail={id:p.id,no:p.no,date:p.date,draft:p.draft,supplier_id:p.supplier_id,supplier_business_name:p.supplier_business_name,summary_subtotal:p.summary_subtotal,summary_tax:p.summary_tax,summary_total:p.summary_total,total:p.total};}}
  results.push({key:d.key,action:'created',invoice_id:id,expected:{net:d.net,tax:d.tax,total:d.total},create_response:c.json,detail});
 }
 return send(res,200,{ok:true,mode:'final_import',results});
}
