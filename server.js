const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const rooms = new Map();
const ROUND_MS = 45_000;
const REVEAL_MS = 7_000;

const scenes = [
  { name: 'The Laundromat', subtitle: 'Last wash, 11:58 PM', sky: 'laundry', target: 'clock', answer: 'The clock is running backwards.', objects: [['clock','Wall clock','It reads 11:58. The second hand trembles.','It reads 11:57, then 11:56. The second hand walks backward.'],['washer','Washer 04','A sock turns slowly behind the glass.','A sock turns slowly behind the glass.'],['plant','Rubber plant','A little dust rests on its leaves.','Its leaves drip with fresh rain.'],['radio','Counter radio','Static between two old songs.','Static between two old songs.'],['basket','Laundry basket','A blue shirt hangs over the rim.','A blue shirt hangs over the rim.'],['window','Front window','Rain beads on the dark glass.','Rain beads on the dark glass.']] },
  { name: 'The Night Diner', subtitle: 'Coffee is always fresh here', sky: 'diner', target: 'menu', answer: 'The menu lists tomorrow’s specials.', objects: [['menu','Menu board','Tonight: pie, eggs, coffee.','Tomorrow: pie, eggs, coffee.'],['cup','Coffee cup','A thin curl of steam rises.','A thin curl of steam rises.'],['stool','Red stool','One leg has a silver cap.','One leg has a silver cap.'],['jukebox','Jukebox','A song is queued but not playing.','A song is queued but not playing.'],['window','Diner window','Neon colors wobble in the glass.','Neon colors wobble in the glass.'],['bell','Service bell','A fingerprint shines on the brass.','A fingerprint shines on the brass.']] },
  { name: 'Apartment 3B', subtitle: 'Someone left the hallway light on', sky: 'apartment', target: 'door', answer: 'The door number is 3B on both sides.', objects: [['door','Apartment door','The brass plate says 3B.','The brass plate says 3B on both sides of the door.'],['plant','Potted fern','One frond leans toward the window.','One frond leans toward the window.'],['phone','Landline phone','The message light is dark.','The message light is dark.'],['mirror','Hall mirror','Your reflection stands still.','Your reflection is a beat behind you.'],['keys','Key bowl','Three keys and a bus token.','Three keys and a bus token.'],['lamp','Table lamp','Warm light pools on the wall.','Warm light pools on the wall.']] },
  { name: 'The Corner Shop', subtitle: 'Open whenever you need it', sky: 'shop', target: 'sign', answer: 'The OPEN sign is lit on the inside and outside.', objects: [['sign','OPEN sign','The red letters glow in the window.','The red letters glow on both sides of the window.'],['apple','Green apple','A small sticker says 40¢.','A small sticker says 40¢.'],['register','Cash register','The drawer is shut.','The drawer is shut.'],['clock','Tiny clock','It is nearly midnight.','It is nearly midnight.'],['radio','Pocket radio','A weather report whispers softly.','A weather report whispers softly.'],['shelf','Cereal shelf','One box faces the wrong way.','One box faces the wrong way.']] },
  { name: 'The Waiting Room', subtitle: 'Your appointment is almost here', sky: 'clinic', target: 'fish', answer: 'The fish tank has no water, but the fish are swimming.', objects: [['fish','Fish tank','A goldfish circles a little castle.','The tank is dry. A goldfish circles the little castle.'],['magazine','Old magazine','The cover is dated last spring.','The cover is dated last spring.'],['chair','Blue chair','The vinyl is cracked on one corner.','The vinyl is cracked on one corner.'],['plant','Peace lily','One white bloom faces the wall.','One white bloom faces the wall.'],['vent','Air vent','A soft, steady hum.','A soft, steady hum.'],['painting','Seascape','A tiny sailboat sits on the horizon.','A tiny sailboat sits on the horizon.']] }
];

const randCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const cleanName = value => String(value || '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 18) || 'Guest';
const hash = value => crypto.createHash('sha256').update(value).digest().readUInt32BE(0) / 0xffffffff;

function publicRoom(room, viewerId) {
  const player = room.players.find(p => p.id === viewerId);
  const round = scenes[room.roundIndex] || null;
  let view = null;
  if (round && (room.status === 'playing' || room.status === 'reveal')) {
    const altered = {};
    const eligible = round.objects.filter(([id]) => id !== round.target);
    const decoys = new Set(eligible.filter(([id]) => hash(`${player?.id}:${room.roundIndex}:${id}:d`) > 0.78).slice(0, 2).map(x => x[0]));
    const seat = room.players.findIndex(p => p.id === viewerId);
    const seesTarget = room.status === 'reveal' || seat === room.roundIndex % room.players.length || hash(`${player?.id}:${room.roundIndex}:target`) > 0.52;
    for (const [id,,normal,weird] of round.objects) altered[id] = id === round.target ? (seesTarget ? weird : normal) : decoys.has(id) ? `For a blink, ${weird.charAt(0).toLowerCase()}${weird.slice(1)}` : normal;
    view = {name:round.name,subtitle:round.subtitle,sky:round.sky,objects:round.objects.map(([id,label,normal])=>({id,label,detail:altered[id],changed:altered[id]!==normal}))};
  }
  const votes = Object.fromEntries(room.players.map(p => [p.id, room.votes[p.id] || null]));
  return {code:room.code,status:room.status,hostId:room.hostId,players:room.players.map(p=>({id:p.id,name:p.name,online:Date.now()-p.seen<15000,hasVoted:Boolean(room.votes[p.id])})),roundNumber:Math.min(room.roundIndex+1,5),roundsTotal:5,endsAt:room.endsAt,view,votes,answer:room.status==='reveal'||room.status==='finished'?{object:round?.objects.find(x=>x[0]===round.target)?.[1],detail:round?.answer}:null,scores:room.players.map(p=>({id:p.id,name:p.name,score:room.scores[p.id]||0})),votedFor:room.votes[viewerId]||null,winningChoice:room.winningChoice};
}

function beginRound(room) {
  room.votes = {};
  room.winningChoice = null;
  room.status = 'playing';
  room.endsAt = Date.now() + ROUND_MS;
}
function reveal(room) {
  if (room.status !== 'playing') return;
  const counts = {};
  for (const vote of Object.values(room.votes)) if (vote) counts[vote] = (counts[vote] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter(k => counts[k] === max);
  room.winningChoice = top.length === 1 ? top[0] : null;
  const correct = scenes[room.roundIndex].target;
  for (const p of room.players) if (room.votes[p.id] === correct) room.scores[p.id] = (room.scores[p.id] || 0) + 1;
  room.status = 'reveal';
  room.endsAt = Date.now() + REVEAL_MS;
}
function tick() {
  const now=Date.now();
  for (const room of rooms.values()) {
    if(room.status==='playing' && (now>=room.endsAt || room.players.length>0 && room.players.every(p=>room.votes[p.id]))) reveal(room);
    else if(room.status==='reveal' && now>=room.endsAt) { room.roundIndex++; if(room.roundIndex>=5) room.status='finished'; else beginRound(room); }
    room.players=room.players.filter(p=>now-p.seen<24*60*60*1000);
  }
}
setInterval(tick,250).unref();

function send(res,status,data,type='application/json; charset=utf-8') { res.writeHead(status,{'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'}); res.end(type.startsWith('application/json')?JSON.stringify(data):data); }
async function body(req) {let s='';for await(const part of req)s+=part;return s?JSON.parse(s):{};}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});return res.end();}
  if(url.pathname==='/api/health') return send(res,200,{ok:true});
  if(url.pathname.startsWith('/api/')) {
    try {
      if(req.method==='POST'&&url.pathname==='/api/rooms') {
        const data=await body(req);let code;do{code=randCode()}while(rooms.has(code));
        const id=crypto.randomUUID();const room={code,hostId:id,players:[{id,name:cleanName(data.name),seen:Date.now()}],scores:{[id]:0},votes:{},status:'lobby',roundIndex:0,endsAt:null,winningChoice:null};rooms.set(code,room);return send(res,201,{playerId:id,room:publicRoom(room,id)});
      }
      const parts=url.pathname.split('/').filter(Boolean);
      const code=(parts[2]||'').toUpperCase();const room=rooms.get(code);
      if(!room)return send(res,404,{error:'Room not found. Check the code and try again.'});
      if(req.method==='POST'&&parts[3]==='join') {
        const data=await body(req);let player=room.players.find(p=>p.id===data.playerId);
        if(!player&&room.status==='lobby'&&room.players.length<6){const id=crypto.randomUUID();player={id,name:cleanName(data.name),seen:Date.now()};room.players.push(player);room.scores[id]=0;}
        if(!player)return send(res,409,{error:room.status==='lobby'?'This room is full.':'The match has already started. Rejoin with the same device.'});
        player.seen=Date.now();return send(res,200,{playerId:player.id,room:publicRoom(room,player.id)});
      }
      const data=req.method==='GET'?{playerId:url.searchParams.get('playerId')}:await body(req);const viewer=room.players.find(p=>p.id===data.playerId);
      if(!viewer)return send(res,403,{error:'Player session not found. Rejoin with the room code.'});viewer.seen=Date.now();
      if(req.method==='GET'&&parts[3]==='state')return send(res,200,{room:publicRoom(room,viewer.id)});
      if(req.method==='POST'&&parts[3]==='start') {if(viewer.id!==room.hostId)return send(res,403,{error:'Only the host can start the match.'});if(room.status!=='lobby')return send(res,409,{error:'The match has already started.'});if(room.players.length<2)return send(res,409,{error:'Invite at least one friend before starting.'});room.roundIndex=0;beginRound(room);return send(res,200,{room:publicRoom(room,viewer.id)});}
      if(req.method==='POST'&&parts[3]==='vote') {if(room.status!=='playing')return send(res,409,{error:'Voting is closed.'});const choice=String(data.choice||'');if(!scenes[room.roundIndex].objects.some(o=>o[0]===choice))return send(res,400,{error:'Choose an object in this room.'});room.votes[viewer.id]=choice;return send(res,200,{room:publicRoom(room,viewer.id)});}
      if(req.method==='POST'&&parts[3]==='reset') {if(viewer.id!==room.hostId)return send(res,403,{error:'Only the host can reset the room.'});room.status='lobby';room.roundIndex=0;room.votes={};room.endsAt=null;room.winningChoice=null;for(const p of room.players)room.scores[p.id]=0;return send(res,200,{room:publicRoom(room,viewer.id)});}
      return send(res,404,{error:'Unknown game action.'});
    } catch(e) {return send(res,400,{error:'Could not read that request.'});}
  }
  const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const full=path.resolve(ROOT,file);
  if(!full.startsWith(ROOT+path.sep))return send(res,403,'Forbidden','text/plain');
  fs.readFile(full,(err,data)=>{if(err)return send(res,404,'Not found','text/plain');const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};send(res,200,data.toString(),types[ext]||'application/octet-stream');});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Odd Hours is listening on ${PORT}`));
