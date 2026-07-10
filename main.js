  function copyToClipboard(text, btn){
    navigator.clipboard.writeText(text).then(()=>{
      btn.classList.add('done');
      setTimeout(()=>btn.classList.remove('done'), 1600);
    });
  }
  function copyPhone(btn){ copyToClipboard('11960232833', btn); }
  function copyEmail(btn){ copyToClipboard('contato@lmssolucoesti.com.br', btn); }

  // Data-flow network mesh — nodes ride a shifting current, links reshape, packets hop node-to-node
  (function(){
    var canvas = document.getElementById('bgMesh');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, nodes = [], packets = [];
    var t = 0;
    var SPEED = 0.55;   // ritmo global da malha: 1 = normal, 0.5 = metade da velocidade

    var CYAN = '47,224,189';
    var BLUE = '62,168,255';
    var LINK_DIST = 185;

    var bounds = { heroEnd: 800, contactStart: 4000 };
    function measureBounds(){
      var heroEl = document.querySelector('.hero');
      var contactEl = document.getElementById('contato');
      if(heroEl) bounds.heroEnd = heroEl.getBoundingClientRect().bottom + window.scrollY;
      if(contactEl) bounds.contactStart = contactEl.getBoundingClientRect().top + window.scrollY;
    }

    var energy = 1, energyTarget = 1;
    function updateEnergy(){
      var y = window.scrollY;
      var vh = window.innerHeight;
      if(y <= 0){
        energyTarget = 1;
      } else if(y < bounds.heroEnd){
        var p = y / Math.max(bounds.heroEnd, 1);
        energyTarget = 1 - p * 0.68;               // 1 -> 0.32 across the hero
      } else {
        var settleEnd = bounds.contactStart - vh * 0.25;
        var maxScroll = Math.max(document.documentElement.scrollHeight - vh, settleEnd + 1);
        if(y < settleEnd){
          energyTarget = 0.32;                      // quiet hum through services/about/cta
        } else {
          var rampSpan = Math.max(1, maxScroll - settleEnd);   // adapts to however much room is actually left
          var q = Math.min(1, (y - settleEnd) / rampSpan);
          energyTarget = 0.32 + q * 0.26;            // 0.32 -> 0.58, completes exactly at page bottom
        }
      }
    }

    function resize(){
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round((W * H) / 16000);
      target = Math.max(40, Math.min(target, 110));
      while(nodes.length < target) nodes.push(makeNode());
      nodes.length = target;
    }

    function makeNode(){
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0, vy: 0,
        r: Math.random() < 0.12 ? 2.6 : 1.3 + Math.random() * 0.8,
        blue: Math.random() < 0.45,
        phase: Math.random() * Math.PI * 2,
        drift: 0.5 + Math.random() * 0.9   // how strongly this node rides the current
      };
    }

    // smooth flow field: direction varies across space and slowly over time,
    // so the whole mesh streams like traffic and keeps reorganizing itself
    function flowAngle(x, y, time){
      return Math.sin(x * 0.0016 + time * 0.00055) * 1.6
           + Math.cos(y * 0.0013 - time * 0.00042) * 1.6
           + Math.sin((x + y) * 0.0007 + time * 0.00021);
    }

    function neighborsOf(node){
      var list = [];
      var maxD = LINK_DIST * (0.66 + energy * 0.55);
      for(var i = 0; i < nodes.length; i++){
        var n = nodes[i];
        if(n === node) continue;
        var d = Math.hypot(n.x - node.x, n.y - node.y);
        if(d < maxD) list.push(n);
      }
      return list;
    }

    function spawnPacket(){
      var a = nodes[(Math.random() * nodes.length) | 0];
      var nb = neighborsOf(a);
      if(!nb.length) return;
      var b = nb[(Math.random() * nb.length) | 0];
      packets.push({a: a, b: b, t: 0, speed: 0.02 + Math.random() * 0.02, hops: 2 + (Math.random() * 3 | 0)});
    }

    function step(){
      t += 16 * SPEED;
      updateEnergy();
      energy += (energyTarget - energy) * 0.025;   // ease toward target — the "settling" feel
      
      var linkDistEff = LINK_DIST * (0.66 + energy * 0.55);
      var linkAlphaMul = 0.42 + energy * 0.75;
      var nodeAlphaMul = 0.5 + energy * 0.65;
      var driftMul = 0.55 + energy * 0.6;

      ctx.clearRect(0, 0, W, H);

      // links
      for(var i = 0; i < nodes.length; i++){
        var n1 = nodes[i];
        for(var j = i + 1; j < nodes.length; j++){
          var n2 = nodes[j];
          var dx = n1.x - n2.x, dy = n1.y - n2.y;
          var d = Math.sqrt(dx*dx + dy*dy);
          if(d < linkDistEff){
            var alpha = (1 - d / linkDistEff) * 0.28 * linkAlphaMul;
            ctx.strokeStyle = 'rgba(' + BLUE + ',' + alpha + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // nodes riding the current
      for(var k = 0; k < nodes.length; k++){
        var n = nodes[k];
        var pulse = 1 + Math.sin(t * 0.0032 + n.phase) * 0.35;
        ctx.fillStyle = 'rgba(' + (n.blue ? BLUE : CYAN) + ',' + ((n.r > 2 ? 0.75 : 0.55) * nodeAlphaMul) + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();

        if(!reduceMotion){
          var ang = flowAngle(n.x, n.y, t);
          // steer toward the current with inertia — clusters form, dissolve, re-form
          n.vx += (Math.cos(ang) * 0.85 * n.drift * driftMul - n.vx) * 0.04;
          n.vy += (Math.sin(ang) * 0.85 * n.drift * driftMul - n.vy) * 0.04;
          n.x += n.vx * SPEED; n.y += n.vy * SPEED;
          if(n.x < -20) n.x = W + 20; else if(n.x > W + 20) n.x = -20;
          if(n.y < -20) n.y = H + 20; else if(n.y > H + 20) n.y = -20;
        }
      }

      // data packets hopping node-to-node (multi-hop routes)
      for(var q = packets.length - 1; q >= 0; q--){
        var pk = packets[q];
        pk.t += pk.speed * SPEED;
        if(pk.t >= 1){
          pk.hops--;
          if(pk.hops <= 0){ packets.splice(q, 1); continue; }
          // hop onward: next leg starts where this one ended
          var nb = neighborsOf(pk.b);
          if(!nb.length){ packets.splice(q, 1); continue; }
          pk.a = pk.b;
          pk.b = nb[(Math.random() * nb.length) | 0];
          pk.t = 0;
        }
        var px = pk.a.x + (pk.b.x - pk.a.x) * pk.t;
        var py = pk.a.y + (pk.b.y - pk.a.y) * pk.t;
        // brighten the link being used
        ctx.strokeStyle = 'rgba(' + CYAN + ',0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pk.a.x, pk.a.y);
        ctx.lineTo(pk.b.x, pk.b.y);
        ctx.stroke();
        // the packet itself with a small trail
        ctx.fillStyle = 'rgba(' + CYAN + ',0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + CYAN + ',0.3)';
        var tx = pk.a.x + (pk.b.x - pk.a.x) * Math.max(0, pk.t - 0.06);
        var ty = pk.a.y + (pk.b.y - pk.a.y) * Math.max(0, pk.t - 0.06);
        ctx.beginPath();
        ctx.arc(tx, ty, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if(!reduceMotion && Math.random() < (0.05 + energy * 0.14) && packets.length < (4 + energy * 12)) spawnPacket();

      if(!reduceMotion) requestAnimationFrame(step);
    }

    resize();
    measureBounds();
    window.addEventListener('resize', function(){ resize(); measureBounds(); if(reduceMotion) step(); });
    window.addEventListener('load', measureBounds);
    if(reduceMotion){ updateEnergy(); energy = energyTarget; window.addEventListener('scroll', function(){ updateEnergy(); energy = energyTarget; step(); }, {passive:true}); }
    step();
  })();

  // Floating WhatsApp button — hidden on the first screen, appears once scrolling begins
  (function(){
    var wa = document.querySelector('.wa-float');
    if(!wa) return;
    function onScroll(){
      if(window.scrollY > 80) wa.classList.add('visible');
      else wa.classList.remove('visible');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  })();


  // Hero diagnostic terminal — typewriter effect
  (function(){
    var el = document.getElementById('termBody');
    if(!el) return;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var lines = [
      {text:'lms@suporte:~$ diagnostico --status', cls:''},
      {text:' rede........................ OK', cls:'ok'},
      {text:' backup....................... OK', cls:'ok'},
      {text:' antivírus.................... OK', cls:'ok'},
      {text:' atendimento.............. disponível', cls:'ok'},
    ];

    if(reduceMotion){
      el.innerHTML = lines.map(function(l){
        return l.cls ? '<span class="'+l.cls+'">'+l.text+'</span>' : l.text;
      }).join('\n') + '\n<span class="term-cursor"></span>';
      return;
    }

    var lineIndex = 0, charIndex = 0;
    var out = '';

    function typeStep(){
      if(lineIndex >= lines.length){
        el.innerHTML = out + '\n<span class="term-cursor"></span>';
        return;
      }
      var line = lines[lineIndex];
      if(charIndex <= line.text.length){
        var partial = line.text.slice(0, charIndex);
        var rendered = out + (line.cls ? '<span class="'+line.cls+'">'+partial+'</span>' : partial);
        el.innerHTML = rendered + '<span class="term-cursor"></span>';
        charIndex++;
        setTimeout(typeStep, 14 + Math.random()*22);
      } else {
        out += (line.cls ? '<span class="'+line.cls+'">'+line.text+'</span>' : line.text) + '\n';
        lineIndex++;
        charIndex = 0;
        setTimeout(typeStep, 260);
      }
    }
    setTimeout(typeStep, 500);
  })();