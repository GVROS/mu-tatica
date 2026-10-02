export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.XAI_API_KEY) return res.status(503).json({error:"XAI_API_KEY não configurada na Vercel"});
  const id=req.query.id;if(!id) return res.status(400).json({error:"request id ausente"});
  try{
    const r=await fetch(`https://api.x.ai/v1/videos/${encodeURIComponent(id)}`,{headers:{"Authorization":`Bearer ${process.env.XAI_API_KEY}`}});
    const data=await r.json();if(!r.ok) return res.status(r.status).json({error:data.error?.message||data.error||"Erro na API da xAI",details:data});
    return res.status(200).json(data);
  }catch(e){return res.status(500).json({error:e.message});}
}