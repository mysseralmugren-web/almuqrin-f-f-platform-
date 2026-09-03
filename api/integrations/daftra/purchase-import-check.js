const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const send=(r,s,b)=>{r.statusCode=s;Object.entries(H).forEach(([k,v])=>r.setHeader(k,v));r.end(JSON.stringify(b));};
const base=()=>String(process.env.DAFTRA_BASE_URL||'').replace(/\/$/,'');
async function get(path){const x=await fetch(base()+path,{headers:{accept:'application/json',APIKEY:process.env.DAFTRA_API_KEY}});let j=null;try{j=await x.json()}catch{};return {ok:x.ok,status:x.status,json:j};}
function rows(j){return Array.isArray(j?.data)?j.data:Array.isArray(j?.result?.data)?j.result.data:[]}
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
 if(!base()||!process.env.DAFTRA_API_KEY)return send(res,503,{ok:false,error:'not_configured'});
 const [sup,tax,inv1,inv2]=await Promise.all([
  get('/api2/suppliers.json?limit=100&page=1'),
  get('/api2/taxes.json?limit=100&page=1'),
  get('/api2/purchase_invoices.json?limit=20&page=1&keywords=3711'),
  get('/api2/purchase_invoices.json?limit=20&page=1&keywords=S00130711')
 ]);
 const suppliers=rows(sup.json).map(x=>x.Supplier||x).filter(Boolean).map(x=>({id:x.id,business_name:x.business_name,first_name:x.first_name,last_name:x.last_name,notes:x.notes,bn1:x.bn1,bn2:x.bn2}));
 const taxes=rows(tax.json).map(x=>x.Tax||x).filter(Boolean).map(x=>({id:x.id,name:x.name,rate:x.rate,value:x.value,percentage:x.percentage}));
 const existing={tools_planet:rows(inv1.json).map(x=>x.PurchaseOrder||x),classic_palace:rows(inv2.json).map(x=>x.PurchaseOrder||x)};
 return send(res,200,{ok:true,suppliers,taxes,existing,statuses:{suppliers:sup.status,taxes:tax.status,tools:inv1.status,classic:inv2.status}});
}
