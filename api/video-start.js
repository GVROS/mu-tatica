export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.XAI_API_KEY) return res.status(503).json({error:"XAI_API_KEY não configurada na Vercel"});
  try{
    const {prompt,image,duration=10,aspect_ratio="16:9",resolution="720p"}=req.body||{};
    if(!prompt && !image) return res.status(400).json({error:"Informe prompt ou imagem"});
    const payload={
      model:"grok-imagine-video-1.5",
      prompt:prompt||undefined,
      duration:Math.min(15,Math.max(1,Number(duration)||10)),
      aspect_ratio,
      resolution,
      generate_audio:false
    };
    if(image) payload.image={url:image};
    const r=await fetch("https://api.x.ai/v1/videos/generations",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.XAI_API_KEY}`},
      body:JSON.stringify(payload)
    });
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data.error?.message||data.error||"Erro na API da xAI",details:data});
    return res.status(200).json(data);
  }catch(e){ return res.status(500).json({error:e.message}); }
}