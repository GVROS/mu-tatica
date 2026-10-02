export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.ELEVENLABS_API_KEY) return res.status(503).json({error:"ELEVENLABS_API_KEY não configurada na Vercel"});
  const {voice,text}=req.body||{};if(!text) return res.status(400).json({error:"Texto ausente"});
  const map={
    narrator:process.env.ELEVENLABS_VOICE_NARRATOR,
    yas:process.env.ELEVENLABS_VOICE_YAS,
    lore:process.env.ELEVENLABS_VOICE_LORE
  };
  const voiceId=map[voice];if(!voiceId) return res.status(503).json({error:`Voice ID de ${voice} não configurado`});
  try{
    const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{
      method:"POST",
      headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({text,model_id:"eleven_multilingual_v2"})
    });
    if(!r.ok){let data={};try{data=await r.json()}catch{};return res.status(r.status).json({error:data.detail?.message||data.detail||"Erro no ElevenLabs"});}
    const audio=Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type","audio/mpeg");res.setHeader("Content-Disposition","attachment; filename=voice.mp3");return res.status(200).send(audio);
  }catch(e){return res.status(500).json({error:e.message});}
}