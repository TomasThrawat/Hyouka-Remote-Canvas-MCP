const sessions = globalThis.__REMOTE_CANVAS_SESSIONS__ ??= new Map();

const PROTOCOL_VERSION = "2025-03-26";

function json(res, status, body, headers = {}) {
  res.status(status);
  for (const [k,v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendResult(res, id, result, sessionId) {
  json(res, 200, {jsonrpc:"2.0", id, result}, {
    "mcp-session-id": sessionId,
    "mcp-protocol-version": PROTOCOL_VERSION,
    "cache-control": "no-cache"
  });
}

function stateFor(sessionId) {
  let s = sessions.get(sessionId);
  if (!s) {
    s = {width:1280,height:720,background:"#0b1020",nodes:[],nextId:1,updatedAt:Date.now(),sessionId};
    sessions.set(sessionId,s);
  }
  return s;
}

function esc(v) {
  return String(v ?? "").replace(/[<>&"]/g, function(ch) {
    return {"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[ch];
  });
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(function(pair){ return pair[1] !== undefined && pair[1] !== null; })
    .map(function(pair){ return pair[0] + '="' + esc(pair[1]) + '"'; })
    .join(" ");
}

function toSvg(s) {
  const body = s.nodes.map(function(n) {
    if (n.type === "rect") return "<rect " + attrs({id:n.id,x:n.x,y:n.y,width:n.width,height:n.height,rx:n.rx,fill:n.fill,stroke:n.stroke,"stroke-width":n.strokeWidth,opacity:n.opacity}) + "/>";
    if (n.type === "circle") return "<circle " + attrs({id:n.id,cx:n.cx,cy:n.cy,r:n.r,fill:n.fill,stroke:n.stroke,"stroke-width":n.strokeWidth,opacity:n.opacity}) + "/>";
    if (n.type === "line") return "<line " + attrs({id:n.id,x1:n.x1,y1:n.y1,x2:n.x2,y2:n.y2,stroke:n.stroke,"stroke-width":n.strokeWidth,opacity:n.opacity}) + "/>";
    if (n.type === "text") return "<text " + attrs({id:n.id,x:n.x,y:n.y,fill:n.fill,"font-size":n.fontSize,"font-family":n.fontFamily,"font-weight":n.fontWeight,opacity:n.opacity}) + ">" + esc(n.text) + "</text>";
    return "";
  }).join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s.width + '" height="' + s.height + '" viewBox="0 0 ' + s.width + ' ' + s.height + '"><rect width="100%" height="100%" fill="' + esc(s.background) + '"/>' + body + '</svg>';
}

function toolDefs() {
  return [
    {name:"create_node",description:"Create an editable vector node on the shared remote canvas.",inputSchema:{type:"object",required:["type"],properties:{
      type:{type:"string",enum:["rect","circle","line","text"]},x:{type:"number"},y:{type:"number"},width:{type:"number"},height:{type:"number"},
      cx:{type:"number"},cy:{type:"number"},r:{type:"number"},x1:{type:"number"},y1:{type:"number"},x2:{type:"number"},y2:{type:"number"},
      text:{type:"string"},fill:{type:"string"},stroke:{type:"string"},strokeWidth:{type:"number"},rx:{type:"number"},opacity:{type:"number"},
      fontSize:{type:"number"},fontFamily:{type:"string"},fontWeight:{type:"string"}
    }}},
    {name:"update_node",description:"Update editable properties of an existing node.",inputSchema:{type:"object",required:["id","patch"],properties:{id:{type:"string"},patch:{type:"object"}}}},
    {name:"delete_node",description:"Delete an existing node.",inputSchema:{type:"object",required:["id"],properties:{id:{type:"string"}}}},
    {name:"get_canvas",description:"Read the current editable canvas state.",inputSchema:{type:"object",properties:{}}},
    {name:"clear_canvas",description:"Remove all nodes from the canvas.",inputSchema:{type:"object",properties:{}}},
    {name:"set_canvas",description:"Set canvas size and background.",inputSchema:{type:"object",properties:{width:{type:"number"},height:{type:"number"},background:{type:"string"}}}},
    {name:"get_svg",description:"Return the current canvas as editable SVG.",inputSchema:{type:"object",properties:{}}},
    {name:"get_canvas_url",description:"Return the browser URL for the editable canvas associated with this MCP session.",inputSchema:{type:"object",properties:{}}}
  ];
}

function callTool(s,name,a) {
  function touch(){s.updatedAt=Date.now();}
  if (name === "create_node") {
    const id = "node-" + s.nextId++;
    const type = a.type;
    const n = {id:id,type:type,opacity:a.opacity ?? 1};
    if (type === "rect") Object.assign(n,{x:a.x??0,y:a.y??0,width:a.width??100,height:a.height??100,rx:a.rx??0,fill:a.fill??"#4f7cff",stroke:a.stroke??"none",strokeWidth:a.strokeWidth??0});
    else if (type === "circle") Object.assign(n,{cx:a.cx??50,cy:a.cy??50,r:a.r??40,fill:a.fill??"#4f7cff",stroke:a.stroke??"none",strokeWidth:a.strokeWidth??0});
    else if (type === "line") Object.assign(n,{x1:a.x1??0,y1:a.y1??0,x2:a.x2??100,y2:a.y2??100,stroke:a.stroke??"#ffffff",strokeWidth:a.strokeWidth??2});
    else if (type === "text") Object.assign(n,{x:a.x??0,y:a.y??40,text:a.text??"Text",fill:a.fill??"#ffffff",fontSize:a.fontSize??32,fontFamily:a.fontFamily??"Arial",fontWeight:a.fontWeight??"400"});
    else throw new Error("Unsupported node type");
    s.nodes.push(n); touch(); return {node:n,svg:toSvg(s)};
  }
  if (name === "update_node") {
    const n = s.nodes.find(function(x){return x.id===a.id;});
    if (!n) throw new Error("Node not found: " + a.id);
    if (!a.patch || typeof a.patch !== "object" || Array.isArray(a.patch)) throw new Error("patch must be an object");
    Object.assign(n,a.patch,{id:n.id,type:n.type}); touch(); return {node:n,svg:toSvg(s)};
  }
  if (name === "delete_node") {
    const i=s.nodes.findIndex(function(x){return x.id===a.id;});
    if(i<0) throw new Error("Node not found: " + a.id);
    const node=s.nodes.splice(i,1)[0]; touch(); return {deleted:node.id,svg:toSvg(s)};
  }
  if(name==="get_canvas") return {width:s.width,height:s.height,background:s.background,nodes:s.nodes,updatedAt:s.updatedAt};
  if(name==="clear_canvas"){s.nodes=[];touch();return {ok:true,svg:toSvg(s)};}
  if(name==="set_canvas"){if(a.width)s.width=a.width;if(a.height)s.height=a.height;if(a.background)s.background=a.background;touch();return {width:s.width,height:s.height,background:s.background,svg:toSvg(s)};}
  if(name==="get_svg") return {svg:toSvg(s)};
  if(name==="get_canvas_url"){
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "localhost:3000";
    return {url:"https://" + host + "/api/canvas?session=" + encodeURIComponent(s.sessionId)};
  }
  throw new Error("Unknown tool: " + name);
}

export default async function handler(req,res) {
  if(req.method==="OPTIONS"){
    res.status(204).setHeader("access-control-allow-origin","*").setHeader("access-control-allow-methods","GET,POST,OPTIONS").setHeader("access-control-allow-headers","Content-Type,Authorization,Mcp-Session-Id,Mcp-Protocol-Version").setHeader("access-control-expose-headers","Mcp-Session-Id").end();
    return;
  }
  if(req.method!=="POST"){json(res,405,{error:"POST required"});return;}
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch{json(res,400,{error:"Invalid JSON"});return;}}
  const method=body && body.method;
  const id=body && body.id !== undefined ? body.id : null;
  let sessionId=req.headers["mcp-session-id"];
  if(Array.isArray(sessionId)) sessionId=sessionId[0];

  if(method==="initialize"){
    sessionId = globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID();
    stateFor(sessionId);
    sendResult(res,id,{protocolVersion:PROTOCOL_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:"Hyouka Remote Canvas MCP",version:"1.0.0"}},sessionId);
    return;
  }
  if(!sessionId){json(res,400,{jsonrpc:"2.0",id:id,error:{code:-32000,message:"MCP session required"}});return;}
  const s=stateFor(sessionId); s.sessionId=sessionId;
  if(method==="notifications/initialized"){res.status(202).setHeader("mcp-session-id",sessionId).end();return;}
  if(method==="ping"){sendResult(res,id,{},sessionId);return;}
  if(method==="tools/list"){sendResult(res,id,{tools:toolDefs()},sessionId);return;}
  if(method==="tools/call"){
    try{
      const out=callTool(s,body.params?.name,body.params?.arguments??{});
      sendResult(res,id,{content:[{type:"text",text:JSON.stringify(out)}],structuredContent:out},sessionId);
    }catch(e){
      sendResult(res,id,{isError:true,content:[{type:"text",text:e instanceof Error?e.message:String(e)}]},sessionId);
    }
    return;
  }
  sendResult(res,id,null,sessionId);
}
