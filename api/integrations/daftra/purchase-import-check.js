const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const send=(r,s,b)=>{r.statusCode=s;Object.entries(H).forEach(([k,v])=>r.setHeader(k,v));r.end(JSON.stringify(b));};
const base=()=>String(process.env.DAFTRA_BASE_URL||'').replace(/\/$/,'');
async function get(path){const x=await fetch(base()+path,{headers:{accept:'application/json',APIKEY:process.env.DAFTRA_API_KEY}});let j=null;try{j=await x.json()}catch{};return {ok:x.ok,status:x.status,json:j};}
const one=j=>j?.data?.PurchaseOrder||j?.data||j?.PurchaseOrder||j||null;
const slimOne=p=>p?{id:p.id,no:p.no,date:p.date,draft:p.draft,supplier_id:p.supplier_id,supplier_business_name:p.supplier_business_name,summary_subtotal:p.summary_subtotal,summary_tax:p.summary_tax,summary_total:p.summary_total,total:p.total}:null;
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
 if(!base()||!process.env.DAFTRA_API_KEY)return send(res,503,{ok:false,error:'not_configured'});
 const ids=Array.from({length:21},(_,i)=>20+i);
 const probes=await Promise.all(ids.map(async id=>{const r=await get(`/api2/purchase_invoices/${id}.json`);return {id,status:r.status,record:r.ok?slimOne(one(r.json)):null};}));
 return send(res,200,{ok:true,probes:probes.filter(x=>x.status!==404)});
}
