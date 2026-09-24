const sessions = globalThis.__REMOTE_CANVAS_SESSIONS__ ??= new Map();
function esc(v){return String(v??"").replace(/[<>&"]/g,function(ch){return {"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[ch];});}
function svg(s){
  const body=s.nodes.map(function(n){
    if(n.type==="rect")return "<rect id=\"" + esc(n.id) + "\" x=\"" + n.x + "\" y=\"" + n.y + "\" width=\"" + n.width + "\" height=\"" + n.height + "\" rx=\"" + (n.rx||0) + "\" fill=\"" + esc(n.fill||"none") + "\" stroke=\"" + esc(n.stroke||"none") + "\" stroke-width=\"" + (n.strokeWidth||0) + "\" opacity=\"" + (n.opacity??1) + "\"/>";
    if(n.type==="circle")return "<circle id=\"" + esc(n.id) + "\" cx=\"" + n.cx + "\" cy=\"" + n.cy + "\" r=\"" + n.r + "\" fill=\"" + esc(n.fill||"none") + "\" stroke=\"" + esc(n.stroke||"none") + "\" stroke-width=\"" + (n.strokeWidth||0) + "\" opacity=\"" + (n.opacity??1) + "\"/>";
    if(n.type==="line")return "<line id=\"" + esc(n.id) + "\" x1=\"" + n.x1 + "\" y1=\"" + n.y1 + "\" x2=\"" + n.x2 + "\" y2=\"" + n.y2 + "\" stroke=\"" + esc(n.stroke||"#fff") + "\" stroke-width=\"" + (n.strokeWidth||2) + "\" opacity=\"" + (n.opacity??1) + "\"/>";
    if(n.type==="text")return "<text id=\"" + esc(n.id) + "\" x=\"" + n.x + "\" y=\"" + n.y + "\" fill=\"" + esc(n.fill||"#fff") + "\" font-size=\"" + (n.fontSize||32) + "\" font-family=\"" + esc(n.fontFamily||"Arial") + "\" font-weight=\"" + esc(n.fontWeight||"400") + "\" opacity=\"" + (n.opacity??1) + "\">" + esc(n.text) + "</text>";
    return "";
  }).join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s.width + '" height="' + s.height + '" viewBox="0 0 ' + s.width + ' ' + s.height + '"><rect width="100%" height="100%" fill="' + esc(s.background) + '"/>' + body + '</svg>';
}
export default function handler(req,res){
  const sid=Array.isArray(req.query?.session)?req.query.session[0]:req.query?.session;
  const s=sid&&sessions.get(sid);
  if(!s)return res.status(404).json({error:"Canvas session not found"});
  res.status(200).setHeader("cache-control","no-store").json({width:s.width,height:s.height,background:s.background,nodes:s.nodes,svg:svg(s),updatedAt:s.updatedAt});
}
